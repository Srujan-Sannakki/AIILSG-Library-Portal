import AuditLog from '../models/AuditLog.js';
export async function audit(req, action, target, session) {
  await AuditLog.create([{ actorId: String(req.user._id), actorType: req.auth.type, action, target: String(target), details: `${action}: ${target}` }], { session });
}
