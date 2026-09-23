import mongoose from 'mongoose';
import { accountFields, safeAccount } from './accountFields.js';
const schema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, name: { type: String, required: true },
  ...accountFields, role: { type: String, enum: ['limited_admin', 'super_admin'], default: 'limited_admin' },
  isCore: { type: Boolean, default: false, immutable: true, select: false },
}, { timestamps: true, strict: 'throw' });
schema.index({ isCore: 1 }, { unique: true, partialFilterExpression: { isCore: true } });
schema.methods.toSafeObject = safeAccount;
export default mongoose.model('Admin', schema);
