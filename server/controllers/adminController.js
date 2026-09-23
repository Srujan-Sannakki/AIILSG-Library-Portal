import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import Admin from '../models/Admin.js';
import { identifier, text, password, list } from '../services/validation.js';
import { revokeSessions } from '../services/sessions.js';
import { audit } from '../services/audit.js';
import { HttpError } from '../middlewares/errorHandler.js';
export const listAdmins = async (req, res) => res.json(await list(Admin, req.query, {}, a => a.toSafeObject()));
export async function createAdmin(req, res) {
  const data = z.object({ id: identifier, name: text, password, role: z.enum(['limited_admin', 'super_admin']).default('limited_admin') }).strict().parse(req.body);
  data.password = await bcrypt.hash(data.password, 12);
  let admin;
  await mongoose.connection.transaction(async session => { [admin] = await Admin.create([data], { session }); await audit(req, 'Create administrator', admin._id, session); });
  res.status(201).json(admin.toSafeObject());
}
export async function deleteAdmin(req, res) {
  const id = identifier.parse(req.params.id);
  await mongoose.connection.transaction(async session => {
    const admin = await Admin.findOne({ id }).select('+isCore').session(session);
    if (!admin) throw new HttpError(404, 'Administrator not found');
    if (admin.isCore || admin.id === 'admin' || String(admin._id) === String(req.user._id)) throw new HttpError(403, 'Cannot delete the core administrator or yourself');
    if (admin.role === 'super_admin') {
      // The immutable core account guarantees a surviving super admin under concurrent deletes.
      if (!await Admin.exists({ isCore: true, role: 'super_admin' }).session(session)) throw new HttpError(409, 'Provision a core administrator before deleting super admins');
    }
    await Admin.deleteOne({ _id: admin._id }).session(session);
    await revokeSessions(admin._id, 'admin', session); await audit(req, 'Delete administrator', admin._id, session);
  });
  res.json({ success: true });
}
