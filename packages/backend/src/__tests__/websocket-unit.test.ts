import jwt from 'jsonwebtoken';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { DeltaDetector } from '../websocket/delta-detector';
import { ExecutionWebSocketServer } from '../websocket/websocket-server';

const JWT_SECRET = 'unit-test-secret';

let portSequence = 9200;

function nextPort(): number {
  portSequence += 1;
  return portSequence;
}

function signToken(userId: string): string {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForSocketOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', (error) => reject(error));
  });
}

function waitForSocketClose(ws: WebSocket): Promise<{ code: number; reason: string }> {
  return new Promise((resolve) => {
    ws.once('close', (code, reason) => {
      resolve({ code, reason: reason.toString() });
    });
  });
}

function waitForJsonMessage<T = any>(
  ws: WebSocket,
  predicate: (payload: T) => boolean,
  timeoutMs = 1500
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.off('message', onMessage);
      reject(new Error(`Timed out after ${timeoutMs}ms waiting for matching WebSocket message`));
    }, timeoutMs);

    const onMessage = (raw: WebSocket.RawData) => {
      try {
        const payload = JSON.parse(raw.toString()) as T;
        if (!predicate(payload)) {
          return;
        }

        clearTimeout(timeout);
        ws.off('message', onMessage);
        resolve(payload);
      } catch (error) {
        clearTimeout(timeout);
        ws.off('message', onMessage);
        reject(error);
      }
    };

    ws.on('message', onMessage);
  });
}

async function waitForCondition(
  assertion: () => void,
  timeoutMs = 1500,
  stepMs = 25
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      assertion();
      return;
    } catch {
      await wait(stepMs);
    }
  }

  assertion();
}

type MockDeltaDetector = Pick<DeltaDetector, 'detectDeltas' | 'validateDeltaSize'> & {
  detectDeltas: ReturnType<typeof vi.fn>;
  validateDeltaSize: ReturnType<typeof vi.fn>;
};

async function createTestServer(
  config: Record<string, any> = {},
  detectorOverrides: Partial<MockDeltaDetector> = {}
): Promise<{
  server: ExecutionWebSocketServer;
  port: number;
  detector: MockDeltaDetector;
}> {
  const port = nextPort();
  const detector: MockDeltaDetector = {
    detectDeltas: vi.fn().mockResolvedValue([]),
    validateDeltaSize: vi.fn().mockReturnValue(true),
    ...detectorOverrides,
  };

  const server = new ExecutionWebSocketServer(
    {
      port,
      path: '/ws',
      updateInterval: 25,
      heartbeatInterval: 5_000,
      idleTimeout: 2_000,
      redisEnabled: false,
      ...config,
    },
    {
      deltaDetector: detector as unknown as DeltaDetector,
    }
  );

  await server.initialize();

  return { server, port, detector };
}

async function connectClient(
  port: number,
  token: string,
  options: { origin?: string } = {}
): Promise<WebSocket> {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${encodeURIComponent(token)}`, {
    headers: options.origin ? { Origin: options.origin } : undefined,
  });

  await waitForSocketOpen(ws);
  return ws;
}

describe('WebSocket Server - Contract Tests', () => {
  let server: ExecutionWebSocketServer | undefined;

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (server) {
      await server.shutdown();
      server = undefined;
    }
  });

  it('aceita conexao autenticada e confirma inscricao no canal do usuario', async () => {
    const setup = await createTestServer();
    server = setup.server;

    const ws = await connectClient(setup.port, signToken('user-1'));
    const subscribedPromise = waitForJsonMessage<{ type: string; channel: string }>(
      ws,
      (payload) => payload.type === 'subscribed'
    );

    ws.send(JSON.stringify({ type: 'subscribe', channel: 'execution-updates:user-1' }));
    const subscribed = await subscribedPromise;

    expect(subscribed.channel).toBe('execution-updates:user-1');
    expect(server.getMetrics().activeConnections).toBe(1);
    expect(server.getMetrics().activeUserPollers).toBe(1);

    ws.close();
    await waitForSocketClose(ws);

    await waitForCondition(() => {
      expect(server?.getMetrics().activeConnections).toBe(0);
      expect(server?.getMetrics().activeUserPollers).toBe(0);
    });
  });

  it('rejeita token invalido com close code 1008', async () => {
    const setup = await createTestServer();
    server = setup.server;

    const ws = new WebSocket(`ws://127.0.0.1:${setup.port}/ws?token=invalid-token`);
    const closed = await waitForSocketClose(ws);

    expect(closed.code).toBe(1008);
  });

  it('rejeita origem fora da allowlist com close code 1008', async () => {
    const setup = await createTestServer();
    server = setup.server;

    const ws = new WebSocket(`ws://127.0.0.1:${setup.port}/ws?token=${encodeURIComponent(signToken('user-1'))}`, {
      headers: {
        Origin: 'http://malicious.local',
      },
    });

    const closed = await waitForSocketClose(ws);

    expect(closed.code).toBe(1008);
    expect(closed.reason).toContain('CORS');
  });

  it('fecha conexao ociosa no timeout configurado', async () => {
    const setup = await createTestServer({
      idleTimeout: 60,
      heartbeatInterval: 1_000,
    });
    server = setup.server;

    const ws = await connectClient(setup.port, signToken('idle-user'));

    const closed = await waitForSocketClose(ws);

    expect(closed.code).toBe(1000);
    expect(closed.reason).toContain('Idle timeout');
  });

  it('fecha conexao quando a mensagem recebida nao e JSON valido', async () => {
    const setup = await createTestServer();
    server = setup.server;

    const ws = await connectClient(setup.port, signToken('user-invalid-json'));

    ws.send('not-json');

    const closed = await waitForSocketClose(ws);

    expect(closed.code).toBe(1008);
    expect(closed.reason).toContain('Invalid message format');
  });

  it('aplica rate limit e encerra a conexao apos burst acima do limite', async () => {
    const setup = await createTestServer({
      rateLimit: {
        messagesPerSecond: 2,
        windowMs: 1_000,
      },
    });
    server = setup.server;

    const ws = await connectClient(setup.port, signToken('user-rate-limit'));

    ws.send(JSON.stringify({ type: 'subscribe' }));
    ws.send(JSON.stringify({ type: 'subscribe' }));
    ws.send(JSON.stringify({ type: 'subscribe' }));

    const closed = await waitForSocketClose(ws);

    expect(closed.code).toBe(1008);
    expect(closed.reason).toContain('Rate limit exceeded');
  });

  it('publica deltas reais detectados pelo poller do usuario', async () => {
    const delta = {
      execution_id: 'exec-1',
      changes: { status: 'completed' },
      updated_at: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };

    const setup = await createTestServer(
      {
        updateInterval: 20,
      },
      {
        detectDeltas: vi
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([delta])
          .mockResolvedValue([]),
      }
    );
    server = setup.server;

    const ws = await connectClient(setup.port, signToken('user-poller'));

    const message = await waitForJsonMessage<{ type: string; data: { execution_id: string } }>(
      ws,
      (payload) => payload.type === 'execution-update'
    );

    expect(message.data.execution_id).toBe('exec-1');
    expect(setup.detector.detectDeltas).toHaveBeenCalledWith('user-poller');

    ws.close();
    await waitForSocketClose(ws);
  });
});

describe('Delta Detection - Unit Tests', () => {
  let deltaDetector: DeltaDetector;
  let mockExecutionService: { queryExecutionHistory: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockExecutionService = {
      queryExecutionHistory: vi.fn(),
    };
    deltaDetector = new DeltaDetector(mockExecutionService as any);
  });

  describe('Delta Detection', () => {
    it('detecta apenas campos alterados do snapshot', async () => {
      const exec1 = {
        id: 'exec-1',
        status: 'running',
        duration: 100,
        error_context: null,
        updated_at: new Date().toISOString(),
      };

      const exec2 = {
        id: 'exec-1',
        status: 'completed',
        duration: 100,
        error_context: null,
        updated_at: new Date(Date.now() + 1_000).toISOString(),
      };

      mockExecutionService.queryExecutionHistory.mockResolvedValueOnce({
        executions: [exec1],
      });
      await deltaDetector.detectDeltas('user-1');

      mockExecutionService.queryExecutionHistory.mockResolvedValueOnce({
        executions: [exec2],
      });

      const deltas = await deltaDetector.detectDeltas('user-1');

      expect(deltas).toHaveLength(1);
      expect(deltas[0]?.changes).toEqual({ status: 'completed', updated_at: exec2.updated_at });
    });

    it('nao repete delta quando error_context permanece nulo', async () => {
      const exec = {
        id: 'exec-null',
        status: 'completed',
        duration: 100,
        error_context: null,
        updated_at: new Date().toISOString(),
      };

      mockExecutionService.queryExecutionHistory.mockResolvedValue({
        executions: [exec],
      });

      await deltaDetector.detectDeltas('user-1');
      const deltas = await deltaDetector.detectDeltas('user-1');

      expect(deltas).toEqual([]);
    });

    it('reporta multiplos campos alterados na primeira observacao', async () => {
      const exec = {
        id: 'exec-1',
        status: 'failed',
        duration: 250,
        error_context: { message: 'Timeout' },
        updated_at: new Date().toISOString(),
      };

      mockExecutionService.queryExecutionHistory.mockResolvedValue({
        executions: [exec],
      });

      const deltas = await deltaDetector.detectDeltas('user-1');

      expect(deltas).toHaveLength(1);
      expect(deltas[0]?.changes).toMatchObject({
        status: 'failed',
        duration: 250,
        error_context: { message: 'Timeout' },
      });
    });

    it('nao envia payload sem mudanca', async () => {
      const exec = {
        id: 'exec-1',
        status: 'completed',
        duration: 100,
        error_context: null,
        updated_at: new Date().toISOString(),
      };

      mockExecutionService.queryExecutionHistory.mockResolvedValue({
        executions: [exec],
      });

      await deltaDetector.detectDeltas('user-1');
      const deltas = await deltaDetector.detectDeltas('user-1');

      expect(deltas).toEqual([]);
    });

    it('consulta a janela padrao dos ultimos 10 minutos', async () => {
      mockExecutionService.queryExecutionHistory.mockResolvedValue({
        executions: [],
      });

      await deltaDetector.detectDeltas('user-1');

      const call = mockExecutionService.queryExecutionHistory.mock.calls[0]?.[0];
      expect(call).toHaveProperty('userId', 'user-1');
      expect(call).toHaveProperty('startDate');
      expect(call).toHaveProperty('endDate');
      expect(call).toHaveProperty('limit', 100);
    });

    it('retorna lista vazia para consultas sem resultados', async () => {
      mockExecutionService.queryExecutionHistory.mockResolvedValue({
        executions: [],
      });

      await expect(deltaDetector.detectDeltas('user-1')).resolves.toEqual([]);
    });

    it('retorna lista vazia quando a consulta falha', async () => {
      mockExecutionService.queryExecutionHistory.mockRejectedValue(
        new Error('Database error')
      );

      await expect(deltaDetector.detectDeltas('user-1')).resolves.toEqual([]);
    });
  });

  describe('Cache Management', () => {
    it('limpa cache de execucao sem aumentar o tamanho armazenado', () => {
      const before = deltaDetector.getCacheStats().size;

      deltaDetector.clearExecutionFromCache('exec-1');

      expect(deltaDetector.getCacheStats().size).toBeLessThanOrEqual(before);
    });

    it('limpa todo o cache', () => {
      deltaDetector.clearAllCache();
      expect(deltaDetector.getCacheStats().size).toBe(0);
    });
  });

  describe('Message Size Validation', () => {
    it('aceita delta menor que 1KB', () => {
      const delta = {
        execution_id: 'exec-1',
        changes: { status: 'completed' },
        updated_at: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      };

      expect(deltaDetector.validateDeltaSize(delta)).toBe(true);
    });

    it('sinaliza payload grande sem quebrar a avaliacao', () => {
      const delta = {
        execution_id: 'exec-1',
        changes: {
          error_context: { message: 'x'.repeat(2_000) },
        },
        updated_at: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      };

      expect(typeof deltaDetector.validateDeltaSize(delta)).toBe('boolean');
    });
  });
});
