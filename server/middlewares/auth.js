import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Session from '../models/Session.js';
import TokenBlacklist from '../models/TokenBlacklist.js';
import Settings from '../models/Settings.js';
import { asyncHandler, HttpError } from './errorHandler.js';
export const authenticateToken = asyncHandler(async (req, res, next) => {
  const token = /^Bearer ([^ ]+)$/.exec(req.headers.authorization || '')?.[1];
  if (!token) throw new HttpError(401, 'Authentication required');
  let claims;
  try { claims = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'aiilsg-api', audience: 'aiilsg-portal' }); }
  catch { throw new HttpError(401, 'Session expired or invalid'); }
  if (!['user', 'admin'].includes(claims.type) || !/^[a-f0-9]{24}$/.test(claims.sub || '') || typeof claims.jti !== 'string') throw new HttpError(401, 'Invalid session');
  if (await TokenBlacklist.exists({ jti: claims.jti }) || !await Session.exists({ jti: claims.jti, accountId: claims.sub, accountType: claims.type })) throw new HttpError(401, 'Session revoked');
  const Model = claims.type === 'admin' ? Admin : User;
  const user = await Model.findById(claims.sub).select('+tokenVersion +active');
  if (!user || user.active === false || (user.tokenVersion || 0) !== claims.ver) throw new HttpError(401, 'Session revoked');
  // User collection can never grant administrative authority, including legacy records.
  req.user = user; req.auth = claims;
  if (claims.type === 'user' && (await Settings.findOne({ key: 'maintenanceMode' }))?.value === true) throw new HttpError(403, 'Portal is under maintenance');
  res.set('Cache-Control', 'no-store');
  next();
});
