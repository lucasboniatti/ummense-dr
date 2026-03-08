import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import { authenticateUser, validateToken } from '../services/auth.service';

const JWT_SECRET = 'unit-test-secret';

test.before(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

test('authenticateUser aceita token assinado e extrai user id', async () => {
  const token = jwt.sign({ id: 'user-123', email: 'test@example.com' }, JWT_SECRET, {
    expiresIn: '1h',
  });

  const userId = await authenticateUser({
    headers: { authorization: `Bearer ${token}` },
  });

  assert.equal(userId, 'user-123');
});

test('authenticateUser aceita token assinado via query string do websocket', async () => {
  const token = jwt.sign({ id: 'user-query-123' }, JWT_SECRET, {
    expiresIn: '1h',
  });

  const userId = await authenticateUser({
    headers: {},
    url: `/ws?token=${encodeURIComponent(token)}`,
  });

  assert.equal(userId, 'user-query-123');
});

test('authenticateUser rejeita token com assinatura inválida', async () => {
  const token = jwt.sign({ id: 'user-123' }, 'wrong-secret', {
    expiresIn: '1h',
  });

  const userId = await authenticateUser({
    headers: { authorization: `Bearer ${token}` },
  });

  assert.equal(userId, null);
});

test('validateToken retorna false para token inválido', () => {
  const token = jwt.sign({ id: 'user-123' }, 'wrong-secret', {
    expiresIn: '1h',
  });

  assert.equal(validateToken(token), false);
});

test('authenticateUser rejeita header malformado', async () => {
  const token = jwt.sign({ id: 'user-123' }, JWT_SECRET, {
    expiresIn: '1h',
  });

  const userId = await authenticateUser({
    headers: { authorization: token },
  });

  assert.equal(userId, null);
});
