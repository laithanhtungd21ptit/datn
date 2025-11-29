import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../../models/User.js';
import { logUserActivity } from '../../utils/logger.js';
import { sendPasswordResetEmail } from '../../services/emailService.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const { username, password, role: expectedRole } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'USERNAME_PASSWORD_REQUIRED' });
  }
  const user = await UserModel.findOne({ username }).lean();
  if (!user) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  if (user.status !== 'active') {
    return res.status(403).json({ error: 'ACCOUNT_DISABLED' });
  }
  if (expectedRole && user.role !== expectedRole) {
    return res.status(403).json({ error: 'ROLE_MISMATCH' });
  }

  const token = jwt.sign(
    { sub: String(user._id), role: user.role, username: user.username },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: '7d' }
  );

  // update last login timestamp (non-blocking)
  try {
  await UserModel.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
    // Log login activity
    await logUserActivity(user._id, user.role, 'login', null, null, `User ${user.username} logged in`, {}, req);
  } catch {}

  return res.json({
  accessToken: token,
  user: {
  id: String(user._id),
  username: user.username,
  role: user.role,
  fullName: user.fullName,
    email: user.email,
      status: user.status,
      avatar: user.avatar || '',
    },
  });
});

authRouter.post('/logout', async (req, res) => {
  // Log logout activity if user is authenticated
  if (req.user) {
    try {
      await logUserActivity(req.user.id, req.user.role, 'logout', null, null, `User ${req.user.username} logged out`, {}, req);
    } catch (error) {
      console.error('Failed to log logout activity:', error);
    }
  }
  return res.json({ success: true });
});

// Forgot password (student only or general)
authRouter.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'EMAIL_REQUIRED' });
  const user = await UserModel.findOne({ email }).lean();
  if (!user) return res.json({ success: true });

  const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const expiresInMinutes = 3;
  const expires = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  await UserModel.updateOne(
    { _id: user._id },
    { $set: { resetPasswordToken: token, resetPasswordExpiresAt: expires } }
  );

  const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const resetPath = process.env.FRONTEND_RESET_PATH || '/reset-password';
  const resetLink = `${frontendBase}${resetPath}?token=${token}`;

  try {
    await sendPasswordResetEmail(user.email, {
      fullName: user.fullName || user.username || 'bạn',
      resetLink,
      token: process.env.NODE_ENV !== 'production' ? token : undefined,
      expiresInMinutes,
    });
  } catch (error) {
    console.error('Failed to send password reset email:', error.message);
  }

  const responsePayload = { success: true };
  if (process.env.NODE_ENV !== 'production') {
    responsePayload.resetToken = token;
    responsePayload.expiresAt = expires;
    responsePayload.expiresInMinutes = expiresInMinutes;
  }

  return res.json(responsePayload);
});

authRouter.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) return res.status(400).json({ error: 'MISSING_FIELDS' });
  const user = await UserModel.findOne({ resetPasswordToken: token, resetPasswordExpiresAt: { $gte: new Date() } });
  if (!user) return res.status(400).json({ error: 'INVALID_OR_EXPIRED_TOKEN' });
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await UserModel.updateOne({ _id: user._id }, { $set: { passwordHash, resetPasswordToken: null, resetPasswordExpiresAt: null } });
  return res.json({ success: true });
});


