import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  customId: { type: String, required: true, unique: true }, title: { type: String, required: true },
  totalPages: { type: Number, required: true }, hasFile: { type: Boolean, default: true },
  storageKey: { type: String, select: false }, storageDriver: { type: String, enum: ['local', 'cloudinary'], select: false },
  filePath: { type: String, select: false },
}, { timestamps: true, strict: 'throw' });
export default mongoose.model('Book', schema);
