import mongoose from 'mongoose';
import { app } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
try {
  await connectDB();
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  const server = app.listen(env.PORT, env.HOST, () => console.log(`API listening on port ${env.PORT}`));
  server.on('error', () => { console.error('Unable to start API'); process.exit(1); });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
    server.close(async () => { await mongoose.disconnect(); process.exit(0); });
    setTimeout(() => process.exit(1), 10000).unref();
  });
} catch { console.error('API startup failed: verify database availability and configuration'); process.exit(1); }
