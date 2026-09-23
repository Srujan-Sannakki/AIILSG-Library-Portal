import multer from 'multer';
import { HttpError } from './errorHandler.js';
export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_BYTES, files: 1, fields: 5, fieldSize: 2048 },
  fileFilter: (req, file, cb) => cb(file.mimetype === 'application/pdf' && /\.pdf$/i.test(file.originalname) ? null : new HttpError(415, 'Only PDF uploads are accepted'), true),
});
