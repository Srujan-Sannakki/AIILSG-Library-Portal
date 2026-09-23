import mongoose from 'mongoose';
import { env } from './env.js';
export async function connectDB() {
  // Controllers validate scalars and build filters explicitly; never pass request objects to MongoDB.
  mongoose.set('sanitizeFilter', false);
  mongoose.set('strictQuery', 'throw');
  await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const topology = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!topology.setName && topology.msg !== 'isdbgrid') {
    await mongoose.disconnect();
    throw new Error('MongoDB must be a replica set or sharded cluster for atomic transactions');
  }
}
