import mongoose from 'mongoose';
import { accountFields, safeAccount } from './accountFields.js';
const schema = new mongoose.Schema({
  sid: { type: String, required: true, unique: true }, name: { type: String, required: true },
  ...accountFields,
  role: { type: String, enum: ['student'], default: 'student' },
  course: String, center: String, medium: String, phone: String, dob: String,
  totalFee: { type: Number, min: 0, default: 0 }, paidAmount: { type: Number, min: 0, default: 0 },
  validFrom: String, validUntil: String, academicYear: String, access: { type: [String], default: [] },
}, { timestamps: true, strict: 'throw', optimisticConcurrency: true });
schema.methods.toSafeObject = safeAccount;
export default mongoose.model('User', schema);
