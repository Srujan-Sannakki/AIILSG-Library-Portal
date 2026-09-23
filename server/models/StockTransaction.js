import mongoose from 'mongoose';
const transactionSchema = new mongoose.Schema({
  itemId: { type: String, required: true, ref: 'InventoryItem' },
  type: { type: String, enum: ['ISSUE', 'RECEIPT'], required: true },
  quantity: { type: Number, required: true },
  particular: String,
  date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  user: String,
  timestamp: { type: Date, default: Date.now }
});
const StockTransaction = mongoose.model('StockTransaction', transactionSchema);
export default StockTransaction;
