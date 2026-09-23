import { Worker } from 'node:worker_threads';
import { HttpError } from '../middlewares/errorHandler.js';
let active = 0;
// Bound parallel parsers, heap use, and execution time; hostile PDFs cannot block the API loop.
export function processPdf(operation, buffer, options = {}) {
  if (active >= 4) throw new HttpError(503, 'Document processing is busy. Please retry.');
  active += 1;
  return new Promise((resolve, reject) => {
    let worker;
    try { worker = new Worker(new URL('./pdfWorker.js', import.meta.url), { workerData: { operation, buffer, ...options }, resourceLimits: { maxOldGenerationSizeMb: 128 } }); }
    catch (error) { active -= 1; reject(error); return; }
    let settled = false;
    const finish = (error, result) => {
      if (settled) return; settled = true; active -= 1; clearTimeout(timer); worker.terminate();
      if (error) reject(error); else resolve(result);
    };
    const timer = setTimeout(() => finish(new HttpError(422, 'Document took too long to process')), 10000);
    worker.once('message', message => finish(message.error ? new HttpError(message.status, message.error) : null, message.result));
    worker.once('error', () => finish(new HttpError(422, 'Unable to process this document')));
    worker.once('exit', code => { if (!settled) finish(new HttpError(422, `Document processing stopped (${code})`)); });
  });
}
