import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// --- 0. ESM FIXES ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 1. CONFIGURATION ---
const app = express();

// EARLY LOGGING - Before everything else
app.use((req, res, next) => {
  console.log(`\n🔥 EARLY LOG: ${req.method} ${req.url} at ${new Date().toISOString()}`);
  next();
});

// CORS Configuration - Allow all origins for development
const corsOptions = {
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- CLOUDINARY CONFIGURATION ---
// Configure Cloudinary (fallback to local storage if not configured)
const CLOUDINARY_CONFIGURED = process.env.CLOUDINARY_CLOUD_NAME && 
                                process.env.CLOUDINARY_API_KEY && 
                                process.env.CLOUDINARY_API_SECRET;

if (CLOUDINARY_CONFIGURED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log("✅ Cloudinary configured for cloud storage");
} else {
  console.warn("⚠️  Cloudinary not configured. Using local storage (not suitable for production).");
  console.warn("   Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.");
  
  // Fallback to local storage for development
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
  }
  app.use('/uploads', express.static(uploadDir));
}

// Multer configuration - use Cloudinary if configured, otherwise local storage
let upload;
if (CLOUDINARY_CONFIGURED) {
  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'aiilsg-portal/books',
      format: async (req, file) => 'pdf',
      resource_type: 'raw', // Use 'raw' for PDFs instead of 'auto'
      public_id: (req, file) => {
        const timestamp = Date.now();
        const originalName = file.originalname.replace(/[^a-zA-Z0-9]/g, '_');
        return `book_${timestamp}_${originalName}`;
      }
    }
  });
  upload = multer({ storage });
} else {
  // Fallback to local storage
  const uploadDir = path.join(__dirname, 'uploads');
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  });
  upload = multer({ storage });
}

// --- 2. DATABASE SCHEMAS ---

// A. User Schema
const userSchema = new mongoose.Schema({
  sid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'student', enum: ['student', 'admin', 'super_admin'] },
  course: String,
  center: String,
  medium: String,
  phone: String,
  totalFee: Number,
  paidAmount: { type: Number, default: 0 },
  validFrom: String,
  validUntil: String,
  academicYear: String,
  access: [String]
});
const User = mongoose.model('User', userSchema);

// B. Book Schema
const bookSchema = new mongoose.Schema({
  customId: { type: String, unique: true },
  title: String,
  totalPages: Number,
  stock: Number,
  filePath: String,
  hasFile: { type: Boolean, default: false }
});
const Book = mongoose.model('Book', bookSchema);

// C. Inventory Schema
const inventoryItemSchema = new mongoose.Schema({
  itemId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  price: Number,
  openingStock: { type: Number, default: 0 },
  minStock: { type: Number, default: 10 }
});
const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);

// D. Transaction Schema
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

// E. Visitor Schema
const visitorSchema = new mongoose.Schema({
  date: String,
  sid: String,
  name: String,
  course: String,
  purpose: String,
  timeIn: String,
  timeOut: String,
  phone: String,
  feedback: String,
  officerName: String
});
const Visitor = mongoose.model('Visitor', visitorSchema);

// F. Admin Schema
const adminSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'limited_admin', enum: ['limited_admin', 'super_admin'] }
});
const Admin = mongoose.model('Admin', adminSchema);

// G. Settings Schema
const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed
}, { collection: 'settings' });
const Settings = mongoose.model('Settings', settingsSchema);

// H. Log Schema
const logSchema = new mongoose.Schema({
  time: String,
  action: String,
  details: String,
  timestamp: { type: Date, default: Date.now }
});
const Log = mongoose.model('Log', logSchema);

// --- 3. SEED DATA ---
const INITIAL_ADMINS = [
  { id: 'admin', name: 'Super Admin', password: 'admin', role: 'super_admin' },
  { id: 'librarian', name: 'Librarian', password: 'lib', role: 'limited_admin' }
];

const INITIAL_SETTINGS = [
  { key: 'announcement', value: 'Welcome to the new academic session.' },
  { key: 'watermarkText', value: 'CONFIDENTIAL - DO NOT SHARE' },
  { key: 'adminNote', value: '' },
  { key: 'maintenanceMode', value: false }
];

const INITIAL_USERS = [
  { 
    sid: '122010620230039', 
    name: 'Sarika Dattatraya Shahane', 
    password: '123', 
    totalFee: 10000, 
    paidAmount: 5000, 
    access: [],
    validFrom: '2025-01-01',
    validUntil: '2025-12-31',
    academicYear: 'Jan 2025 - Dec 2025',
    phone: '9881129972',
    course: 'Sanitary Inspector',
    center: 'Pune',
    medium: 'Marathi'
  },
  { 
    sid: '122010620230041', 
    name: 'Sadik Maula Shaikh', 
    password: '123', 
    totalFee: 10000, 
    paidAmount: 10000, 
    access: [],
    validFrom: '2025-06-01',
    validUntil: '2026-05-31',
    academicYear: 'June 2025 - May 2026',
    phone: '9552809708',
    course: 'LSGD',
    center: 'Hadapsar',
    medium: 'English'
  }
];

// --- 4. DATABASE CONNECTION & AUTO-SEED ---
mongoose.set('strictQuery', false);

// FIX: Use 127.0.0.1 instead of localhost to prevent IPv6 resolution issues on Mac
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aiilsg_portal';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log(`✅ MongoDB Connected to ${MONGO_URI}`);
    
    // Seed initial data
    try {
        // Seed Users (hash passwords)
        const userCount = await User.countDocuments();
        if (userCount === 0) {
            console.log("🌱 Seeding initial users...");
            const hashedUsers = await Promise.all(
              INITIAL_USERS.map(async (user) => ({
                ...user,
                password: await bcrypt.hash(user.password, 10)
              }))
            );
            await User.insertMany(hashedUsers);
            console.log("✅ Initial users created!");
        } else {
            console.log(`ℹ️  Database already has ${userCount} users.`);
        }

        // Seed Admins (hash passwords)
        const adminCount = await Admin.countDocuments();
        if (adminCount === 0) {
            console.log("🌱 Seeding initial admins...");
            const hashedAdmins = await Promise.all(
              INITIAL_ADMINS.map(async (admin) => ({
                ...admin,
                password: await bcrypt.hash(admin.password, 10)
              }))
            );
            await Admin.insertMany(hashedAdmins);
            console.log("✅ Initial admins created!");
        } else {
            console.log(`ℹ️  Database already has ${adminCount} admins.`);
        }

        // Seed Settings
        const settingsCount = await Settings.countDocuments();
        if (settingsCount === 0) {
            console.log("🌱 Seeding initial settings...");
            await Settings.insertMany(INITIAL_SETTINGS);
            console.log("✅ Initial settings created!");
        } else {
            console.log(`ℹ️  Database already has ${settingsCount} settings.`);
        }
    } catch (err) {
        console.error("Auto-seed error:", err);
    }
  })
  .catch(err => {
      console.error('❌ MongoDB Connection Error:', err.message);
      console.error('   -> Ensure MongoDB is running: "brew services list"');
      console.error('   -> Try restarting it: "brew services restart mongodb-community"');
  });


// --- 5. AUTHENTICATION MIDDLEWARE ---

// JWT Secret (use environment variable or default for development)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Optional: Admin-only middleware
const requireAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'super_admin' && req.user.role !== 'limited_admin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Input Validation Helpers
const validateSID = (sid) => {
  if (!sid || typeof sid !== 'string') return false;
  const trimmed = sid.trim();
  // SID should be 15 characters (alphanumeric)
  return /^[A-Za-z0-9]{15}$/.test(trimmed);
};

const validatePhone = (phone) => {
  if (!phone) return true; // Optional field
  // Indian phone number format: 10 digits
  return /^[0-9]{10}$/.test(phone.trim());
};

const validateEmail = (email) => {
  if (!email) return true; // Optional field
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// --- 6. API ROUTES ---

// Logging Middleware - Must be before routes to catch all requests
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  console.log(`   Origin: ${req.headers.origin || 'none'}`);
  console.log(`   Host: ${req.headers.host || 'none'}`);
  console.log(`   User-Agent: ${req.headers['user-agent']?.substring(0, 60) || 'none'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('✅ Health check requested');
  res.json({ 
    status: 'ok', 
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// === AUTH ===
app.post('/api/login', async (req, res) => {
  console.log("👉 Login Attempt Received:", { id: req.body.id, password: req.body.password ? "***" : "missing" });
  const { id, password } = req.body;
  
  // Input Validation
  if (!id || !password) {
      console.log("❌ Missing credentials");
      return res.status(400).json({ error: "Missing ID or password" });
  }

  if (typeof id !== 'string' || id.trim().length === 0) {
      return res.status(400).json({ error: "Invalid ID format" });
  }

  if (typeof password !== 'string' || password.length < 3) {
      return res.status(400).json({ error: "Password must be at least 3 characters" });
  }

  // 1. Database Admin Check
  try {
    const admin = await Admin.findOne({ id: id.trim() });
    if (admin) {
      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (isPasswordValid) {
        console.log(`✅ Admin Login Success: ${admin.name}`);
        
        // Generate JWT token
        const token = jwt.sign(
          { id: admin._id, role: admin.role, type: 'admin' },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        
        return res.json({ 
          success: true, 
          token,
          user: { 
            name: admin.name, 
            id: admin.id, 
            role: admin.role,
            _id: admin._id
          }
        });
      } else {
        console.log(`❌ Password incorrect for admin: ${id}`);
      }
    }
  } catch (error) {
    console.error("❌ Admin login DB error:", error);
  }

  // 2. Database User Check
  try {
    const trimmedId = id.trim();
    console.log(`🔍 Searching for user with SID: ${trimmedId}`);
    const user = await User.findOne({ sid: trimmedId });

    if (user) {
      console.log(`👤 User found: ${user.name}, checking password...`);
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (isPasswordValid) {
        console.log(`✅ User Login Success: ${user.name} (${user.sid})`);

        const token = jwt.sign(
          { id: user._id, role: user.role || 'student', type: 'user' },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        return res.json({
          success: true,
          token,
          user: {
            ...user.toObject(),
            role: user.role || 'student'
          }
        });
      } else {
        console.log(`❌ Password incorrect for user: ${id}`);
      }
    } else {
      console.log(`❌ User not found in DB with SID: ${trimmedId}`);

      if (mongoose.Types.ObjectId.isValid(trimmedId)) {
        const userById = await User.findById(trimmedId);
        if (userById) {
          console.log(`👤 Found user by _id instead: ${userById.name}`);
          const isPasswordValid = await bcrypt.compare(password, userById.password);
          if (isPasswordValid) {
            console.log(`✅ User Login Success (by _id): ${userById.name}`);

            const token = jwt.sign(
              { id: userById._id, role: userById.role || 'student', type: 'user' },
              JWT_SECRET,
              { expiresIn: '7d' }
            );

            return res.json({
              success: true,
              token,
              user: {
                ...userById.toObject(),
                role: userById.role || 'student'
              }
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ Login DB Error:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({ error: 'Database error during login' });
  }

  console.log(`❌ Login failed for ID: ${id}`);
  res.status(401).json({ error: 'Invalid Credentials' });
});

app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find().select('-password'); // Don't send passwords
    console.log(`📋 Found ${users.length} users in database`);
    res.json(users);
  } catch (e) {
    console.error("❌ Error fetching users:", e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { sid, name, password, phone, email, ...otherFields } = req.body;
    
    // Input Validation
    if (!sid || !name || !password) {
      return res.status(400).json({ error: 'SID, name, and password are required' });
    }
    
    if (!validateSID(sid)) {
      return res.status(400).json({ error: 'SID must be exactly 15 alphanumeric characters' });
    }
    
    if (password.length < 3) {
      return res.status(400).json({ error: 'Password must be at least 3 characters' });
    }
    
    if (phone && !validatePhone(phone)) {
      return res.status(400).json({ error: 'Phone number must be 10 digits' });
    }
    
    if (email && !validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ sid: sid.trim() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this SID already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = new User({
      ...otherFields,
      sid: sid.trim(),
      name: name.trim(),
      password: hashedPassword,
      phone: phone ? phone.trim() : undefined,
      email: email ? email.trim() : undefined
    });
    
    await newUser.save();
    // Don't send password back
    const userResponse = newUser.toObject();
    delete userResponse.password;
    res.json(userResponse);
  } catch (e) {
    console.error("❌ Error creating user:", e);
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // If password is being updated, hash it
    if (updateData.password) {
      if (updateData.password.length < 3) {
        return res.status(400).json({ error: 'Password must be at least 3 characters' });
      }
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    
    // Validate other fields if provided
    if (updateData.sid && !validateSID(updateData.sid)) {
      return res.status(400).json({ error: 'SID must be exactly 15 alphanumeric characters' });
    }
    
    if (updateData.phone && !validatePhone(updateData.phone)) {
      return res.status(400).json({ error: 'Phone number must be 10 digits' });
    }
    
    if (updateData.email && !validateEmail(updateData.email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    const updatedUser = await User.findOneAndUpdate(
      { $or: [{ _id: id }, { sid: id }] },
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Don't send password back
    const userResponse = updatedUser.toObject();
    delete userResponse.password;
    res.json(userResponse);
  } catch (e) {
    console.error("❌ Error updating user:", e);
    res.status(400).json({ error: e.message });
  }
});

// === BOOKS ===
app.get('/api/books', authenticateToken, async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/books', authenticateToken, requireAdmin, upload.single('pdf'), async (req, res) => {
  try {
    const { title, totalPages, customId } = req.body;
    
    let fileUrl = null;
    
    if (req.file) {
      if (CLOUDINARY_CONFIGURED) {
        // CloudinaryStorage returns URL in req.file.path or req.file.url
        // Prefer secure_url if available, otherwise use path
        fileUrl = req.file.secure_url || req.file.url || req.file.path;
        console.log("✅ File uploaded to Cloudinary:", fileUrl);
      } else {
        // Local storage - convert to URL path
        const cleanPath = req.file.path.replace(/\\/g, '/');
        const filename = cleanPath.split('/').pop();
        fileUrl = `/uploads/${filename}`;
        console.log("📁 File saved locally:", fileUrl);
      }
    }
    
    const newBook = new Book({
      customId: customId || `b${Date.now()}`,
      title,
      totalPages,
      stock: 5,
      hasFile: !!req.file,
      filePath: fileUrl // Now stores Cloudinary URL or local path
    });
    await newBook.save();
    res.json(newBook);
  } catch (e) {
    console.error("❌ Error uploading book:", e);
    res.status(500).json({ error: e.message });
  }
});

// === INVENTORY & TRANSACTIONS ===
app.get('/api/inventory', authenticateToken, async (req, res) => {
  try {
    const items = await InventoryItem.find();
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/inventory', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { itemId, name, type, price, openingStock, minStock } = req.body;
    const item = await InventoryItem.findOneAndUpdate(
      { itemId }, 
      { name, type, price, openingStock, minStock }, 
      { upsert: true, new: true }
    );
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const filter = req.query.itemId ? { itemId: req.query.itemId } : {};
    const transactions = await StockTransaction.find(filter).sort({ timestamp: -1 });
    res.json(transactions);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/transactions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { itemId, type, quantity, particular, user, date } = req.body;
    if (!itemId || !quantity || !type) return res.status(400).json({ error: "Missing fields" });

    const newTx = new StockTransaction({
      itemId,
      type,
      quantity: Number(quantity),
      particular,
      user,
      date: date || new Date().toISOString().split('T')[0]
    });

    await newTx.save();
    res.json(newTx);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === VISITORS ===
app.get('/api/visitors', authenticateToken, async (req, res) => {
  try {
    const visitors = await Visitor.find().sort({ _id: -1 });
    res.json(visitors);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/visitors', authenticateToken, async (req, res) => {
  try {
    const visitor = new Visitor(req.body);
    await visitor.save();
    res.json(visitor);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === ADMINS ===
app.get('/api/admins', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const admins = await Admin.find().select('-password'); // Don't send passwords
    res.json(admins);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admins', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id, name, password, role } = req.body;
    
    // Input Validation
    if (!id || !name || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (typeof id !== 'string' || id.trim().length < 3) {
      return res.status(400).json({ error: 'Admin ID must be at least 3 characters' });
    }
    
    if (password.length < 3) {
      return res.status(400).json({ error: 'Password must be at least 3 characters' });
    }
    
    if (role && !['super_admin', 'limited_admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be super_admin or limited_admin' });
    }
    
    const existingAdmin = await Admin.findOne({ id: id.trim() });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin ID already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newAdmin = new Admin({ 
      id: id.trim(), 
      name: name.trim(), 
      password: hashedPassword, 
      role: role || 'limited_admin' 
    });
    await newAdmin.save();
    
    // Don't send password back
    const adminResponse = newAdmin.toObject();
    delete adminResponse.password;
    res.json(adminResponse);
  } catch (e) {
    console.error("❌ Error creating admin:", e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admins/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await Admin.findOneAndDelete({ id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === SETTINGS ===
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    const settingsDocs = await Settings.find();
    const settingsObj = {};
    settingsDocs.forEach(s => {
      settingsObj[s.key] = s.value;
    });
    // Ensure all settings exist with defaults
    if (!settingsObj.announcement) settingsObj.announcement = 'Welcome to the new academic session.';
    if (!settingsObj.watermarkText) settingsObj.watermarkText = 'CONFIDENTIAL - DO NOT SHARE';
    if (!settingsObj.adminNote) settingsObj.adminNote = '';
    if (settingsObj.maintenanceMode === undefined) settingsObj.maintenanceMode = false;
    res.json(settingsObj);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await Settings.findOneAndUpdate(
        { key },
        { key, value },
        { upsert: true, new: true }
      );
    }
    const settingsDocs = await Settings.find();
    const settingsObj = {};
    settingsDocs.forEach(s => {
      settingsObj[s.key] = s.value;
    });
    res.json(settingsObj);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === LOGS ===
app.get('/api/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const logs = await Log.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/logs', authenticateToken, async (req, res) => {
  try {
    const { time, action, details } = req.body;
    const newLog = new Log({ time, action, details });
    await newLog.save();
    res.json(newLog);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await Log.deleteMany({});
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- 6. TEST ROUTE (for debugging) ---
app.get('/test', (req, res) => {
  console.log('✅ Test route hit!');
  res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

// --- 7. CATCH-ALL ROUTE FOR DEBUGGING ---
// This must be last, after all other routes
app.use((req, res) => {
  console.log(`⚠️  Unhandled route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Route not found', method: req.method, url: req.originalUrl });
});

// --- 8. START SERVER ---
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Server started on port ${PORT}`);
  console.log(`📡 Server accessible at http://127.0.0.1:${PORT}`);
  console.log(`📡 Server accessible at http://localhost:${PORT}`);
  console.log(`🌐 CORS enabled for all origins`);
  console.log(`\n✅ Test the server: curl http://127.0.0.1:${PORT}/test`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.error(`   Try: lsof -ti:${PORT} | xargs kill -9`);
  } else {
    console.error('❌ Server error:', err);
  }
});
