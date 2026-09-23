import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
let mongo, app, mongoose;
before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  Object.assign(process.env, { NODE_ENV: 'test', MONGO_URI: mongo.getUri(), JWT_SECRET: 'a'.repeat(64), CLIENT_ORIGIN: 'http://localhost:5173' });
  ({ app } = await import('../app.js'));
  mongoose = (await import('mongoose')).default;
  await (await import('../config/db.js')).connectDB();
});
after(async () => { await mongoose?.disconnect(); await mongo?.stop(); });
test('application connects and reports readiness', async () => { await request(app).get('/api/health').expect(200); });
test('protected users endpoint rejects missing authentication', async () => { await request(app).get('/api/users').expect(401); });
test('configuration refuses missing secrets', async () => {
  const { validateEnv } = await import('../config/env.js');
  assert.throws(() => validateEnv({ MONGO_URI: process.env.MONGO_URI, CLIENT_ORIGIN: process.env.CLIENT_ORIGIN }), /JWT_SECRET/);
});
