export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  let status = err.status || 500;
  let message = status < 500 ? err.message : 'Internal server error';
  if (err.name === 'ZodError') { status = 400; message = 'Invalid input: ' + err.issues.map(i => i.path.join('.') + ' ' + i.message).join('; '); }
  if (['ValidationError', 'CastError', 'StrictModeError'].includes(err.name)) { status = 400; message = 'Invalid input'; }
  if (err.code === 11000) { status = 409; message = 'Record already exists'; }
  if (err.name === 'MulterError') { status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400; message = 'Upload rejected: PDF files up to 20 MB only'; }
  if (status >= 500) console.error('Request failed', { method: req.method, path: req.path, error: err.name });
  res.status(status).json({ error: message });
}
