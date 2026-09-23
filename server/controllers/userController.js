import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import User from '../models/User.js';
import Book from '../models/Book.js';
import { text, password, sid, phone, money, date, profile, userFilter, list, identifier } from '../services/validation.js';
import { audit } from '../services/audit.js';
import { revokeSessions } from '../services/sessions.js';
import { HttpError } from '../middlewares/errorHandler.js';
export const listUsers = async (req, res) => res.json(await list(User, req.query, {}, x => x.toSafeObject()));
export async function createUser(req, res) {
  const data = z.object({ sid, name: text, password, phone: phone.optional(), course: text.optional(), center: text.optional(), medium: text.optional(), dob: date.optional(), totalFee: money, paidAmount: money.default(0), validFrom: date, validUntil: date, academicYear: text, access: z.array(identifier).max(500).default([]) }).strict().parse(req.body);
  if (data.validFrom > data.validUntil || data.paidAmount > data.totalFee) throw new HttpError(400, 'Invalid fees or validity range');
  if (data.access.length && await Book.countDocuments({ customId: { $in: [...new Set(data.access)] } }) !== new Set(data.access).size) throw new HttpError(400, 'Unknown book assignment');
  data.password = await bcrypt.hash(data.password, 12);
  let user;
  await mongoose.connection.transaction(async session => { [user] = await User.create([data], { session }); await audit(req, 'Create user', user._id, session); });
  res.status(201).json(user.toSafeObject());
}
export async function updateProfile(req, res) {
  const data = profile.parse(req.body);
  const target = await User.findOne(userFilter(req.params.id));
  if (!target) throw new HttpError(404, 'User not found');
  if (req.auth.type !== 'admin' && String(req.user._id) !== String(target._id)) throw new HttpError(403, 'Cannot edit another user');
  let user;
  await mongoose.connection.transaction(async session => { user = await User.findByIdAndUpdate(target._id, { $set: data }, { returnDocument: 'after', runValidators: true, session }); if (!user) throw new HttpError(404, 'User not found'); await audit(req, 'Update profile', user._id, session); });
  res.json(user.toSafeObject());
}
export async function updateFees(req, res) {
  const data = z.object({ totalFee: money.optional(), paidAmount: money }).strict().parse(req.body);
  let user;
  await mongoose.connection.transaction(async session => {
    user = await User.findOne(userFilter(req.params.id)).session(session);
    if (!user) throw new HttpError(404, 'User not found');
    if (data.paidAmount > (data.totalFee ?? user.totalFee)) throw new HttpError(400, 'Paid amount cannot exceed total fee');
    Object.assign(user, data); await user.save({ session }); await audit(req, 'Update fees', user._id, session);
  });
  res.json(user.toSafeObject());
}
export async function updatePermissions(req, res) {
  const data = z.object({ access: z.array(identifier).max(500).optional(), validFrom: date.optional(), validUntil: date.optional() }).strict().parse(req.body);
  let user;
  await mongoose.connection.transaction(async session => {
    user = await User.findOne(userFilter(req.params.id)).session(session);
    if (!user) throw new HttpError(404, 'User not found');
    if (data.access) {
      data.access = [...new Set(data.access)];
      if (await Book.countDocuments({ customId: { $in: data.access } }).session(session) !== data.access.length) throw new HttpError(400, 'Unknown book assignment');
    }
    Object.assign(user, data);
    if (!user.validFrom || !user.validUntil || user.validFrom > user.validUntil) throw new HttpError(400, 'Invalid validity range');
    await user.save({ session }); await audit(req, 'Update permissions', user._id, session);
  });
  res.json(user.toSafeObject());
}
export async function changePassword(req, res) {
  const { currentPassword, newPassword } = z.object({ currentPassword: z.string().min(1).max(72), newPassword: password }).strict().parse(req.body);
  const user = await User.findOne(userFilter(req.params.id)).select('+password');
  if (!user) throw new HttpError(404, 'User not found');
  if (req.auth.type !== 'user' || String(req.user._id) !== String(user._id)) throw new HttpError(403, 'Use the administrator reset endpoint');
  if (!await bcrypt.compare(currentPassword, user.password)) throw new HttpError(400, 'Current password is incorrect');
  await replacePassword(req, user, newPassword, user.password);
  res.json({ success: true });
}
export async function resetPassword(req, res) {
  const { newPassword } = z.object({ newPassword: password }).strict().parse(req.body);
  const user = await User.findOne(userFilter(req.params.id));
  if (!user) throw new HttpError(404, 'User not found');
  await replacePassword(req, user, newPassword);
  res.json({ success: true });
}
async function replacePassword(req, user, newPassword, oldHash) {
  const hash = await bcrypt.hash(newPassword, 12);
  await mongoose.connection.transaction(async session => {
    const result = await User.updateOne({ _id: user._id, ...(oldHash ? { password: oldHash } : {}) }, { $set: { password: hash }, $inc: { tokenVersion: 1 } }, { session });
    if (!result.matchedCount) throw new HttpError(409, 'Account changed; try again');
    await revokeSessions(user._id, 'user', session); await audit(req, 'Reset password', user._id, session);
  });
}
export async function deleteUser(req, res) {
  await mongoose.connection.transaction(async session => {
    const user = await User.findOneAndDelete(userFilter(req.params.id)).session(session);
    if (!user) throw new HttpError(404, 'User not found');
    await revokeSessions(user._id, 'user', session); await audit(req, 'Delete user', user._id, session);
  });
  res.json({ success: true });
}
