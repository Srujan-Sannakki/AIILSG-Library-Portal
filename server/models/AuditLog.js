import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  actorId: { type: String, required: true, immutable: true }, actorType: { type: String, required: true, immutable: true },
  action: { type: String, required: true, immutable: true }, target: { type: String, immutable: true },
  details: { type: String, immutable: true }, timestamp: { type: Date, default: Date.now, immutable: true },
}, { collection: 'auditlogs', strict: 'throw' });
schema.index({ timestamp: -1, _id: -1 });
export default mongoose.model('AuditLog', schema);
