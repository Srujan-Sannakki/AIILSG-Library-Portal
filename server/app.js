import express from 'express';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', env.TRUST_PROXY_HOPS);
app.use(helmet({ contentSecurityPolicy: { directives: { workerSrc: ["'self'", 'blob:'], imgSrc: ["'self'", 'data:', 'https://www.worldmayorsforum.com'], upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null } }, strictTransportSecurity: env.NODE_ENV === 'production' ? undefined : false }));
app.use(cors({ origin: env.CLIENT_ORIGIN, methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '64kb' }));
app.get('/api/health', (req, res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({ status: mongoose.connection.readyState === 1 ? 'ok' : 'unavailable' }));
app.use('/api', routes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found' }));
if (env.NODE_ENV === 'production') {
  const dist = fileURLToPath(new URL('../dist/', import.meta.url));
  if (!existsSync(path.join(dist, 'index.html'))) throw new Error('Run npm run build before starting production');
  app.use(express.static(dist, { index: false, dotfiles: 'deny' }));
  app.get('/{*path}', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);
