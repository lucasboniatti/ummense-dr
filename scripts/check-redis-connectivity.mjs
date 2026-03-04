import net from 'node:net';

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = Number(process.env.REDIS_PORT || 6379);
const redisUrl = process.env.REDIS_URL || `redis://${redisHost}:${redisPort}`;

function pingRedis(host, port) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let response = '';

    socket.setTimeout(5000);

    socket.on('connect', () => {
      socket.write('*1\r\n$4\r\nPING\r\n');
    });

    socket.on('data', (chunk) => {
      response += chunk.toString('utf8');
      if (response.includes('PONG')) {
        socket.destroy();
        resolve(true);
      }
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error(`Redis ping timeout for ${host}:${port}`));
    });

    socket.on('error', (error) => {
      socket.destroy();
      reject(error);
    });

    socket.on('close', () => {
      if (!response.includes('PONG')) {
        resolve(false);
      }
    });

    socket.connect(port, host);
  });
}

async function run() {
  try {
    const websocketUrl = new URL(redisUrl);
    const [backendOk, websocketOk] = await Promise.all([
      pingRedis(redisHost, redisPort),
      pingRedis(websocketUrl.hostname, Number(websocketUrl.port || 6379)),
    ]);

    const result = {
      backendQueueRedis: backendOk ? 'ok' : 'failed',
      websocketRedis: websocketOk ? 'ok' : 'failed',
      redisHost,
      redisPort,
      redisUrl,
    };

    console.log(JSON.stringify(result, null, 2));

    if (!backendOk || !websocketOk) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(
      `[infra] Redis connectivity check failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    process.exit(1);
  }
}

void run();
