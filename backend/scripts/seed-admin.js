/**
 * Seed Script — Create Admin User
 * Run: node scripts/seed-admin.js
 *
 * This script creates the first admin account in MongoDB Atlas.
 * It is idempotent — safe to run multiple times; skips if email already exists.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.join(__dirname, '../.env') });

// ─── Admin credentials — change these before running ─────────────────────────
const ADMIN = {
  name:     'Super Admin',
  email:    'admin@newscms.com',
  password: 'Admin@1234',
  role:     'admin',
  status:   'active',
};
// ──────────────────────────────────────────────────────────────────────────────

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌  MONGO_URI is not defined in .env');
  process.exit(1);
}

// Inline User schema + bcrypt to avoid circular imports
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name:            String,
  email:           { type: String, unique: true, lowercase: true },
  password:        { type: String, select: false },
  role:            { type: String, enum: ['admin', 'manager', 'editor'], default: 'editor' },
  status:          { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdBy:       { type: mongoose.Schema.Types.ObjectId, default: null },
  assignedManager: { type: mongoose.Schema.Types.ObjectId, default: null },
  lastLogin:       { type: Date, default: null },
}, { timestamps: true });

const permSchema = new mongoose.Schema({
  userId:            { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  canCreateUser:     { type: Boolean, default: false },
  canApprovePost:    { type: Boolean, default: false },
  canDeletePost:     { type: Boolean, default: false },
  canManageCats:     { type: Boolean, default: false },
  canActivateUser:   { type: Boolean, default: false },
  canViewReports:    { type: Boolean, default: false },
  canEditApprovedPost:{ type: Boolean, default: false },
  updatedBy:         { type: mongoose.Schema.Types.ObjectId, default: null },
}, { timestamps: true });

const User       = mongoose.models.User       || mongoose.model('User', userSchema);
const Permission = mongoose.models.Permission || mongoose.model('Permission', permSchema);

async function seed() {
  console.log('🔗  Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI);
  console.log('✅  Connected:', mongoose.connection.host);

  // Check if admin already exists
  const existing = await User.findOne({ email: ADMIN.email.toLowerCase() });
  if (existing) {
    console.log(`⚠️   Admin already exists: ${existing.email}  (id: ${existing._id})`);
    console.log('     No changes made. Run with a different email to create another admin.');
    await mongoose.disconnect();
    return;
  }

  // Hash password
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(ADMIN.password, salt);

  // Create admin user
  const admin = await User.create({
    name:     ADMIN.name,
    email:    ADMIN.email.toLowerCase(),
    password: hashedPassword,
    role:     'admin',
    status:   'active',
  });

  // Create matching permissions record (all enabled for admin)
  await Permission.create({
    userId:             admin._id,
    canCreateUser:      true,
    canApprovePost:     true,
    canDeletePost:      true,
    canManageCats:      true,
    canActivateUser:    true,
    canViewReports:     true,
    canEditApprovedPost:true,
    updatedBy:          admin._id,
  });

  console.log('');
  console.log('🎉  Admin user created successfully!');
  console.log('─────────────────────────────────────');
  console.log(`   Name    : ${admin.name}`);
  console.log(`   Email   : ${admin.email}`);
  console.log(`   Password: ${ADMIN.password}`);
  console.log(`   Role    : ${admin.role}`);
  console.log(`   ID      : ${admin._id}`);
  console.log('─────────────────────────────────────');
  console.log('⚠️   Please change the password after first login!');

  await mongoose.disconnect();
  console.log('🔌  Disconnected.');
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
});
