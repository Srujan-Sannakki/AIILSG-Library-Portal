import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
export function validateEnv(input) {
  const schema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    MONGO_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//),
    JWT_SECRET: z.string().min(48).refine(v => !/change|example|your-secret/i.test(v)),
    CLIENT_ORIGIN: z.string().url().refine(v => new URL(v).origin === v),
    PORT: z.coerce.number().int().min(0).max(65535).default(5000),
    HOST: z.string().default('127.0.0.1'),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
    STORAGE_DRIVER: z.enum(['local', 'cloudinary']).default('local'),
    PRIVATE_STORAGE_DIR: z.string().default(fileURLToPath(new URL('../../../aiilsg-private-files/', import.meta.url))),
    CLOUDINARY_CLOUD_NAME: z.string().optional(), CLOUDINARY_API_KEY: z.string().optional(), CLOUDINARY_API_SECRET: z.string().optional(),
  }).superRefine((v, ctx) => {
    if (v.STORAGE_DRIVER === 'cloudinary') for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
      if (!v[key]) ctx.addIssue({ code: 'custom', path: [key], message: 'Required for Cloudinary storage' });
    }
    if (v.NODE_ENV === 'production' && !v.CLIENT_ORIGIN.startsWith('https://')) ctx.addIssue({ code: 'custom', path: ['CLIENT_ORIGIN'], message: 'HTTPS required' });
  });
  const result = schema.safeParse(input);
  if (!result.success) throw new Error(`Invalid environment: ${result.error.issues.map(i => i.path.join('.') + ': ' + i.message).join('; ')}`);
  return result.data;
}
export const env = validateEnv(process.env);
