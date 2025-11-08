import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'teacher', 'student'], required: true, index: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    isLocked: { type: Boolean, default: false },
    phone: { type: String, required: true, trim: true },
    department: { type: String, default: '' },
    studentId: { type: String, default: '', index: true }, // Student ID for students (e.g., "B21DCPT001")
    teacherId: { type: String, default: '', index: true }, // Teacher ID for teachers (e.g., "GVPTIT001")
    address: { type: String, default: '' },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, enum: ['Nam', 'Nữ', 'Khác'], default: 'Nam' },
    avatar: { type: String, default: '' }, // Profile picture URL
    lastLoginAt: { type: Date, default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Field-level indexes/unique are already defined above; avoid duplicating here to prevent conflicts

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);


