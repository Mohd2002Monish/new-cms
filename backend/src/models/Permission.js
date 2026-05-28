import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // One permission settings record per user
  },
  canCreateUser: {
    type: Boolean,
    default: false,
  },
  canApprovePost: {
    type: Boolean,
    default: false,
  },
  canDeletePost: {
    type: Boolean,
    default: false,
  },
  canManageCats: {
    type: Boolean,
    default: false,
  },
  canActivateUser: {
    type: Boolean,
    default: false,
  },
  canViewReports: {
    type: Boolean,
    default: false,
  },
  canEditApprovedPost: {
    type: Boolean,
    default: false,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  }
}, {
  timestamps: true
});

export const Permission = mongoose.model('Permission', permissionSchema);
