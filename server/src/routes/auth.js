import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Task from '../models/Task.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();
const limiter = rateLimit({ max: 30 });

const sign = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email });
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

router.post('/register', limiter, async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name?.trim() || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
  if (!emailOk(email)) return res.status(400).json({ error: 'Please enter a valid email address' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (await User.findOne({ email: email.toLowerCase() })) {
    return res.status(409).json({ error: 'Email already registered' });
  }
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: sign(user), user: publicUser(user) });
});

router.post('/login', limiter, async (req, res) => {
  const { email, password } = req.body || {};
  const user = email && (await User.findOne({ email: String(email).toLowerCase() }));
  if (!user || !(await bcrypt.compare(password || '', user.password))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ token: sign(user), user: publicUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

router.patch('/me', requireAuth, async (req, res) => {
  const { name } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  const user = await User.findByIdAndUpdate(req.userId, { name: name.trim() }, { new: true });
  res.json({ user: publicUser(user) });
});

router.post('/change-password', requireAuth, limiter, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  const user = await User.findById(req.userId);
  if (!user || !(await bcrypt.compare(currentPassword || '', user.password))) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ ok: true });
});

router.delete('/me', requireAuth, async (req, res) => {
  await Task.deleteMany({ user: req.userId });
  await User.findByIdAndDelete(req.userId);
  res.json({ ok: true });
});

export default router;
