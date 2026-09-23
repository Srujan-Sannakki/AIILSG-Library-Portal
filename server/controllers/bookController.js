import mongoose from 'mongoose';
import { z } from 'zod';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import Book from '../models/Book.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import { identifier, text, list } from '../services/validation.js';
import { storePdf, readPdf, removePdf } from '../services/storage.js';
import { entitledPages } from '../services/pdf.js';
import { processPdf } from '../services/pdfProcessing.js';
import { audit } from '../services/audit.js';
import { HttpError } from '../middlewares/errorHandler.js';
export async function listBooks(req, res) {
  const filter = req.auth.type === 'user' ? { customId: { $in: req.user.access || [] } } : {};
  res.json(await list(Book, req.query, filter, b => ({ ...b.toObject(), entitledPages: req.auth.type === 'user' ? entitledPages(req.user, b) : b.totalPages })));
}
export async function createBook(req, res) {
  const { title, customId } = z.object({ title: text, customId: identifier, totalPages: z.string().optional() }).strict().parse(req.body);
  if (!req.file) throw new HttpError(400, 'A PDF file is required');
  const { pages } = await processPdf('inspect', req.file.buffer);
  const storage = await storePdf(req.file.buffer);
  let book;
  try {
    await mongoose.connection.transaction(async session => {
      [book] = await Book.create([{ customId, title, totalPages: pages, ...storage }], { session });
      await audit(req, 'Upload book', book.customId, session);
    });
  } catch (error) { await removePdf(storage); throw error; }
  res.status(201).json({ _id: book._id, customId, title, totalPages: book.totalPages, hasFile: true });
}
export async function deliverPage(req, res) {
  const id = identifier.parse(req.params.id);
  const page = z.coerce.number().int().min(1).max(1000).parse(req.params.page);
  const book = await Book.findOne({ customId: id }).select('+storageKey +storageDriver');
  if (!book) throw new HttpError(404, 'Book not found');
  if (page > book.totalPages) throw new HttpError(404, 'Page not found');
  if (req.auth.type === 'user' && page > entitledPages(req.user, book)) throw new HttpError(403, 'This page is not assigned, paid for, or within your access dates');
  const watermark = (await Settings.findOne({ key: 'watermarkText' }))?.value || 'AIILSG - Personal use only';
  const bytes = Buffer.from(await processPdf('page', await readPdf(book), { page, watermark: `${req.user.sid || req.user.id} | ${new Date().toISOString().slice(0, 10)} | ${watermark}` }));
  await audit(req, 'Read page', `${id}:${page}`);
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="page.pdf"', 'Cache-Control': 'private, no-store', 'Content-Length': String(bytes.length), 'X-Content-Type-Options': 'nosniff' });
  await pipeline(Readable.from(bytes), res);
}
export async function deleteBook(req, res) {
  const id = identifier.parse(req.params.id);
  let book;
  await mongoose.connection.transaction(async session => {
    book = await Book.findOneAndDelete({ customId: id }).select('+storageKey +storageDriver').session(session);
    if (!book) throw new HttpError(404, 'Book not found');
    await User.updateMany({ access: id }, { $pull: { access: id } }).session(session);
    await audit(req, 'Delete book', id, session);
  });
  await removePdf(book);
  res.json({ success: true });
}
