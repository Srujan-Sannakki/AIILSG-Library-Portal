import mongoose from 'mongoose';
import { z } from 'zod';
import Inventory from '../models/Inventory.js';
import StockTransaction from '../models/StockTransaction.js';
import { identifier, text, count, money, date, list } from '../services/validation.js';
import { audit } from '../services/audit.js';
import { HttpError } from '../middlewares/errorHandler.js';
export const listInventory = async (req, res) => res.json(await list(Inventory, req.query));
export const listTransactions = async (req, res) => res.json(await list(StockTransaction, req.query, req.query.itemId ? { itemId: identifier.parse(req.query.itemId) } : {}));
export async function createInventory(req, res) {
  const data = z.object({ itemId: identifier, name: text, type: text, price: money.default(0), openingStock: count.default(0), minStock: count.default(10) }).strict().parse(req.body);
  let item;
  await mongoose.connection.transaction(async session => { [item] = await Inventory.create([{ ...data, currentStock: data.openingStock }], { session }); await audit(req, 'Create inventory', data.itemId, session); });
  res.status(201).json(item);
}
export async function createTransaction(req, res) {
  const { itemId, type, quantity, particular, date: txDate } = z.object({ itemId: identifier, type: z.enum(['ISSUE', 'RECEIPT']), quantity: count.refine(v => v > 0, 'Must be positive'), particular: text, date: date.optional() }).strict().parse(req.body);
  let transaction, updatedItem;
  await mongoose.connection.transaction(async session => {
    const item = await Inventory.findOneAndUpdate({ itemId, currentStock: type === 'ISSUE' ? { $gte: quantity } : { $lte: 100000000 - quantity } }, { $inc: { currentStock: type === 'ISSUE' ? -quantity : quantity, [type === 'ISSUE' ? 'totalOut' : 'totalIn']: quantity } }, { returnDocument: 'after', session });
    updatedItem = item;
    if (!item) throw new HttpError(409, 'Item unavailable, insufficient stock, or stock limit exceeded');
    [transaction] = await StockTransaction.create([{ itemId, type, quantity, particular, date: txDate || new Date().toISOString().slice(0, 10), user: String(req.user._id) }], { session });
    await audit(req, 'Stock transaction', transaction._id, session);
  });
  res.status(201).json({ ...transaction.toObject(), inventory: updatedItem.toObject() });
}
