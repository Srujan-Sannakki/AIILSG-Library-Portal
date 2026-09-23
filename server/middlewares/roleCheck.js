import { HttpError } from './errorHandler.js';
export const roleCheck = (...roles) => (req, res, next) => {
  if (req.auth?.type !== 'admin' || !roles.includes(req.user?.role)) return next(new HttpError(403, 'Insufficient permissions'));
  next();
};
export const requireAdmin = roleCheck('super_admin', 'limited_admin');
export const requireSuperAdmin = roleCheck('super_admin');
