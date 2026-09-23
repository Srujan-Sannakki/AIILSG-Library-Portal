import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import cloudinary from '../config/cloudinary.js';
import { env } from '../config/env.js';
import { HttpError } from '../middlewares/errorHandler.js';
import { MAX_PDF_BYTES } from '../middlewares/upload.js';
function localPath(key) {
  if (!/^[a-f0-9-]+\.pdf$/.test(key)) throw new HttpError(404, 'Document unavailable');
  return path.join(env.PRIVATE_STORAGE_DIR, key);
}
export async function storePdf(buffer) {
  if (env.STORAGE_DRIVER === 'local') {
    await mkdir(env.PRIVATE_STORAGE_DIR, { recursive: true, mode: 0o700 });
    const key = `${randomUUID()}.pdf`;
    await writeFile(localPath(key), buffer, { flag: 'wx', mode: 0o600 });
    return { storageDriver: 'local', storageKey: key };
  }
  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ resource_type: 'raw', type: 'authenticated', public_id: `aiilsg/private/${randomUUID()}.pdf`, overwrite: false }, (error, value) => error ? reject(error) : resolve(value)).end(buffer);
  });
  return { storageDriver: 'cloudinary', storageKey: result.public_id };
}
export async function readPdf(book) {
  if (!book.storageKey) throw new HttpError(409, 'Legacy document must be re-uploaded privately');
  if (book.storageDriver === 'local') return readFile(localPath(book.storageKey));
  if (book.storageDriver !== 'cloudinary' || env.STORAGE_DRIVER !== 'cloudinary') throw new HttpError(503, 'Document storage unavailable');
  // Signed origin URL is consumed only by the backend, never exposed to the client.
  const url = cloudinary.utils.private_download_url(book.storageKey, '', { resource_type: 'raw', type: 'authenticated', expires_at: Math.floor(Date.now() / 1000) + 60 });
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'error' });
  if (!response.ok || Number(response.headers.get('content-length')) > MAX_PDF_BYTES) throw new HttpError(502, 'Unable to read document');
  const chunks = []; let length = 0;
  for await (const chunk of response.body) { length += chunk.length; if (length > MAX_PDF_BYTES) throw new HttpError(502, 'Document exceeds size limit'); chunks.push(Buffer.from(chunk)); }
  return Buffer.concat(chunks);
}
export async function removePdf(book) {
  if (!book.storageKey) return;
  if (book.storageDriver === 'local') await unlink(localPath(book.storageKey)).catch(e => { if (e.code !== 'ENOENT') throw e; });
  else await cloudinary.uploader.destroy(book.storageKey, { resource_type: 'raw', type: 'authenticated', invalidate: true });
}
