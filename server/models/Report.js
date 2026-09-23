import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  userId: String, context: String, issue: String, purpose: String, date: String,
  officer: { type: String, default: '' }, designation: { type: String, default: '' },
  status: { type: String, enum: ['Pending', 'Resolved'], default: 'Pending' },
}, { timestamps: true, strict: 'throw' });
export default mongoose.model('Report', schema);
