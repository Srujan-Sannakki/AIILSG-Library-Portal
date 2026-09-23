// Run with the API stopped, after taking a database backup.
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Inventory from '../models/Inventory.js';
import StockTransaction from '../models/StockTransaction.js';
await connectDB();
try {
  for (const item of await Inventory.find({ currentStock: { $exists: false } })) {
    await mongoose.connection.transaction(async session => {
      const transactions = await StockTransaction.find({ itemId: item.itemId }).session(session);
      let totalIn = 0, totalOut = 0;
      for (const tx of transactions) {
        if (!Number.isSafeInteger(tx.quantity) || tx.quantity <= 0) throw new Error(`Invalid legacy transaction for ${item.itemId}; reconcile before migration`);
        if (tx.type === 'RECEIPT') totalIn += tx.quantity; else if (tx.type === 'ISSUE') totalOut += tx.quantity; else throw new Error('Unknown transaction type');
      }
      const currentStock = (item.openingStock || 0) + totalIn - totalOut;
      if (currentStock < 0) throw new Error(`Negative legacy stock for ${item.itemId}; reconcile before migration`);
      await Inventory.updateOne({ _id: item._id, currentStock: { $exists: false } }, { $set: { currentStock, totalIn, totalOut } }, { session, runValidators: true });
    });
  }
  console.log('Inventory migration complete');
} finally { await mongoose.disconnect(); }
