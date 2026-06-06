/**
 * Seed Script — Create Test Reader User
 * Run: node scripts/seed-test-user.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌  MONGO_URI is not defined in .env');
  process.exit(1);
}

const userSchema = new mongoose.Schema({
  name:            String,
  email:           { type: String, unique: true, lowercase: true },
  password:        { type: String, select: false },
  role:            { type: String, enum: ['admin', 'manager', 'editor', 'reader'], default: 'reader' },
  status:          { type: String, enum: ['active', 'inactive'], default: 'active' },
  interests:       { type: Map, of: Number, default: {} },
  readArticles:    [{ type: String, default: [] }],
  createdBy:       { type: mongoose.Schema.Types.ObjectId, default: null },
  assignedManager: { type: mongoose.Schema.Types.ObjectId, default: null },
  lastLogin:       { type: Date, default: null },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

const READER_USER = {
  name:     'Test Reader',
  email:    'test@example.com',
  password: 'password123',
  role:     'reader',
  status:   'active',
};

async function seed() {
  console.log('🔗  Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI);
  console.log('✅  Connected:', mongoose.connection.host);

  // Check if user already exists
  const existing = await User.findOne({ email: READER_USER.email.toLowerCase() });
  if (existing) {
    console.log(`⚠️   Reader already exists: ${existing.email} (id: ${existing._id})`);
    // update password to password123 in case it was changed
    const salt = await bcrypt.genSalt(12);
    existing.password = await bcrypt.hash(READER_USER.password, salt);
    existing.role = 'reader';
    await existing.save();
    console.log('     Updated user password and role to reader.');
    await mongoose.disconnect();
    return;
  }

  // Hash password
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(READER_USER.password, salt);

  // Create user
  const user = await User.create({
    name:     READER_USER.name,
    email:    READER_USER.email.toLowerCase(),
    password: hashedPassword,
    role:     READER_USER.role,
    status:   READER_USER.status,
  });

  console.log('');
  console.log('🎉  Test reader user created successfully!');
  console.log('─────────────────────────────────────');
  console.log(`   Name    : ${user.name}`);
  console.log(`   Email   : ${user.email}`);
  console.log(`   Password: ${READER_USER.password}`);
  console.log(`   Role    : ${user.role}`);
  console.log(`   ID      : ${user._id}`);
  console.log('─────────────────────────────────────');

  await mongoose.disconnect();
  console.log('🔌  Disconnected.');
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
});
