import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { HttpError } from '../middlewares/errorHandler.js';
export async function parsePdf(buffer) {
  if (buffer.subarray(0, 5).toString() !== '%PDF-') throw new HttpError(415, 'File content is not a PDF');
  let doc;
  try { doc = await PDFDocument.load(buffer, { throwOnInvalidObject: true }); }
  catch { throw new HttpError(415, 'Invalid or encrypted PDF'); }
  if (doc.getPageCount() < 1 || doc.getPageCount() > 1000) throw new HttpError(400, 'PDF must contain 1–1000 pages');
  return doc;
}
export function entitledPages(user, book, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  if (!user.validFrom || !user.validUntil || today < user.validFrom || today > user.validUntil || !user.access?.includes(book.customId)) return 0;
  if (!Number.isFinite(user.totalFee) || user.totalFee < 0 || !Number.isFinite(user.paidAmount) || user.paidAmount < 0) return 0;
  const ratio = user.totalFee === 0 ? 1 : Math.min(1, user.paidAmount / user.totalFee);
  return Math.floor(book.totalPages * ratio);
}
export async function pagePdf(buffer, pageNumber, watermark) {
  const source = await parsePdf(buffer);
  if (pageNumber > source.getPageCount()) throw new HttpError(404, 'Page not found');
  const doc = await PDFDocument.create();
  // Embed only page drawing content: do not copy annotations, document scripts or attachments.
  const page = source.getPage(pageNumber - 1);
  const embedded = await doc.embedPage(page);
  const output = doc.addPage([page.getWidth(), page.getHeight()]);
  output.drawPage(embedded);
  output.drawText(watermark.replace(/[^\x20-\x7E]/g, '').slice(0, 100), { x: 25, y: output.getHeight() / 2, size: 16, color: rgb(0.4, 0.4, 0.4), opacity: 0.3, rotate: degrees(25) });
  return Buffer.from(await doc.save());
}
