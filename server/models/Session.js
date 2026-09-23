import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  jti: { type: String, unique: true, required: true }, accountId: { type: String, required: true, index: true },
  accountType: { type: String, enum: ['user', 'admin'], required: true }, expiresAt: { type: Date, required: true },
});
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model('Session', schema);
