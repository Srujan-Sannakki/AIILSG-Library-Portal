import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  itemId: { type: String, required: true, unique: true }, name: { type: String, required: true }, type: { type: String, required: true },
  price: { type: Number, min: 0, default: 0 }, openingStock: { type: Number, min: 0, default: 0 },
  currentStock: { type: Number, min: 0, required: true }, minStock: { type: Number, min: 0, default: 10 },
  totalIn: { type: Number, default: 0 }, totalOut: { type: Number, default: 0 },
}, { strict: 'throw', timestamps: true });
export default mongoose.model('InventoryItem', schema);
