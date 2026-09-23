import { parentPort, workerData } from 'node:worker_threads';
import { parsePdf, pagePdf } from './pdf.js';
try {
  const buffer = Buffer.from(workerData.buffer);
  const result = workerData.operation === 'inspect'
    ? { pages: (await parsePdf(buffer)).getPageCount() }
    : await pagePdf(buffer, workerData.page, workerData.watermark);
  parentPort.postMessage({ result });
} catch (error) { parentPort.postMessage({ error: error.message, status: error.status || 415 }); }
