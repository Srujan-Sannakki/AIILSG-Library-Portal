import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import { connectDB } from '../config/db.js';
import { identifier, password, text } from '../services/validation.js';
await connectDB();
try {
  if (await Admin.exists({ isCore: true })) throw new Error('Core administrator already exists');
  const id = identifier.parse(process.env.BOOTSTRAP_ADMIN_ID);
  const name = text.parse(process.env.BOOTSTRAP_ADMIN_NAME);
  const hash = await bcrypt.hash(password.parse(process.env.BOOTSTRAP_ADMIN_PASSWORD), 12);
  if (await Admin.exists({ id })) throw new Error('Choose a new core administrator ID');
  await Admin.create({ id, name, password: hash, role: 'super_admin', isCore: true });
  console.log('Core administrator provisioned. Remove bootstrap credentials from your environment.');
} finally { await mongoose.disconnect(); }
