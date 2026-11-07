import mongoose from 'mongoose';

const systemSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  group: {
    type: String,
    enum: ['oauth', 'email', 'general', 'security', 'ai', 'analytics'],
    required: true,
    default: 'general',
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  description: {
    type: String,
    default: '',
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
});

/**
 * Helper static method to fetch a setting by key, merging with provided defaults/fallback.
 */
systemSettingSchema.statics.getSetting = async function (key, fallback = {}) {
  try {
    const record = await this.findOne({ key }).lean();
    if (record && record.value && typeof record.value === 'object') {
      return { ...fallback, ...record.value };
    }
    return fallback;
  } catch (error) {
    console.error(`Error loading system setting "${key}":`, error.message);
    return fallback;
  }
};

export const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);
export default SystemSetting;
