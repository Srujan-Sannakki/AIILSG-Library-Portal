import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Session from '../models/Session.js';
import TokenBlacklist from '../models/TokenBlacklist.js';
import Settings from '../models/Settings.js';
import { env } from '../config/env.js';
import { identifier, password as passwordSchema } from '../services/validation.js';
import { audit } from '../services/audit.js';
import { HttpError } from '../middlewares/errorHandler.js';
const dummyHash = await bcrypt.hash(randomUUID(), 12);
export async function login(req, res) {
  const { id, password } = z.object({ id: identifier, password: passwordSchema }).strict().parse(req.body);
  let account = await Admin.findOne({ id }).select('+password +tokenVersion +active');
  const type = account ? 'admin' : 'user';
  const Model = type === 'admin' ? Admin : User;
  if (!account) account = await User.findOne({ sid: id }).select('+password +tokenVersion +active');
  const valid = await bcrypt.compare(password, account?.password || dummyHash);
  if (!valid || !account || account.active === false) throw new HttpError(401, 'Invalid credentials');
  if (type === 'user' && (await Settings.findOne({ key: 'maintenanceMode' }))?.value === true) throw new HttpError(403, 'Portal is under maintenance');
  let token;
  await mongoose.connection.transaction(async session => {
    // Serialize issuance against password changes, deactivation and revocation.
    const current = await Model.findOneAndUpdate({ _id: account._id, password: account.password }, { $inc: { sessionCounter: 1 } }, { returnDocument: 'after', session }).select('+tokenVersion +active');
    if (!current || current.active === false) throw new HttpError(401, 'Credentials changed; log in again');
    const jti = randomUUID();
    token = jwt.sign({ type, ver: current.tokenVersion || 0 }, env.JWT_SECRET, { algorithm: 'HS256', subject: String(current._id), jwtid: jti, issuer: 'aiilsg-api', audience: 'aiilsg-portal', expiresIn: '30m' });
    await Session.create([{ jti, accountId: String(current._id), accountType: type, expiresAt: new Date(Date.now() + 30 * 60 * 1000) }], { session });
    await audit({ user: current, auth: { type } }, 'Login', current._id, session);
    account = current;
  });
  res.set('Cache-Control', 'no-store').json({ success: true, token, user: { ...account.toSafeObject(), ...(type === 'user' ? { role: 'student' } : {}) } });
}
export async function me(req, res) { res.json({ ...req.user.toSafeObject(), ...(req.auth.type === 'user' ? { role: 'student' } : {}) }); }
export async function logout(req, res) {
  await mongoose.connection.transaction(async session => {
    await TokenBlacklist.updateOne({ jti: req.auth.jti }, { $setOnInsert: { jti: req.auth.jti, expiresAt: new Date(req.auth.exp * 1000) } }, { upsert: true, session });
    await Session.deleteOne({ jti: req.auth.jti }).session(session);
    await audit(req, 'Logout', req.user._id, session);
  });
  res.json({ success: true });
}
