import mongoose from 'mongoose';
import { z } from 'zod';
import Visitor from '../models/Visitor.js';
import Settings from '../models/Settings.js';
import AuditLog from '../models/AuditLog.js';
import { text, phone, date, list } from '../services/validation.js';
import { audit } from '../services/audit.js';
export const listVisitors = async (req, res) => res.json(await list(Visitor, req.query));
export async function createVisitor(req, res) {
  const optional = z.string().trim().max(200).optional();
  const data = z.object({ date, sid: optional, name: text, course: optional, purpose: text, timeIn: optional, timeOut: optional, phone: phone.optional(), feedback: z.string().max(2000).optional() }).strict().parse(req.body);
  let visitor;
  await mongoose.connection.transaction(async session => { [visitor] = await Visitor.create([{ ...data, officerName: req.user.name }], { session }); await audit(req, 'Create visitor', visitor._id, session); });
  res.status(201).json(visitor);
}
const defaults = { announcement: 'Welcome to the library.', watermarkText: 'AIILSG — Personal use only', maintenanceMode: false, adminNote: '' };
export async function getSettings(req, res) {
  const settings = { ...defaults };
  for (const s of await Settings.find({ key: { $in: Object.keys(defaults) } })) settings[s.key] = s.value;
  if (req.auth.type !== 'admin') delete settings.adminNote;
  res.json(settings);
}
export async function updateSettings(req, res) {
  const data = z.object({ announcement: z.string().max(2000).optional(), watermarkText: z.string().max(150).optional(), maintenanceMode: z.boolean().optional(), adminNote: z.string().max(5000).optional() }).strict().parse(req.body);
  await mongoose.connection.transaction(async session => {
    for (const [key, value] of Object.entries(data)) await Settings.updateOne({ key }, { $set: { value } }, { upsert: true, session });
    await audit(req, 'Update settings', Object.keys(data).join(','), session);
  });
  await getSettings(req, res);
}
export const listLogs = async (req, res) => res.json(await list(AuditLog, req.query, {}, log => ({ ...log.toObject(), time: log.timestamp.toISOString() })));
