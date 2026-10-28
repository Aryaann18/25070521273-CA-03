import { Router } from 'express';
import mongoose from 'mongoose';
import Task from '../models/Task.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const validId = (req, res, next) =>
  mongoose.isValidObjectId(req.params.id) ? next() : res.status(400).json({ error: 'Invalid task id' });

const cleanTags = (tags) =>
  Array.isArray(tags)
    ? [...new Set(tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))].slice(0, 8)
    : undefined;

const parseDue = (v) => {
  if (v === null || v === '') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

router.get('/', async (req, res) => {
  const tasks = await Task.find({ user: req.userId }).sort({ done: 1, createdAt: -1 });
  res.json(tasks);
});

router.get('/stats', async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [total, done, overdue, completedThisWeek] = await Promise.all([
    Task.countDocuments({ user: userId }),
    Task.countDocuments({ user: userId, done: true }),
    Task.countDocuments({ user: userId, done: false, dueDate: { $lt: now, $ne: null } }),
    Task.countDocuments({ user: userId, done: true, completedAt: { $gte: weekAgo } }),
  ]);
  res.json({ total, done, active: total - done, overdue, completedThisWeek });
});

router.post('/', async (req, res) => {
  const { title, notes, priority, dueDate, tags } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  const due = parseDue(dueDate ?? null);
  if (due === undefined) return res.status(400).json({ error: 'Invalid due date' });
  const task = await Task.create({ user: req.userId, title, notes, priority, dueDate: due, tags: cleanTags(tags) });
  res.status(201).json(task);
});

// Remove all completed tasks (must be declared before '/:id')
router.delete('/completed', async (req, res) => {
  const result = await Task.deleteMany({ user: req.userId, done: true });
  res.json({ deleted: result.deletedCount });
});

router.patch('/:id', validId, async (req, res) => {
  const body = req.body || {};
  const update = {};
  for (const k of ['title', 'notes', 'priority']) if (k in body) update[k] = body[k];
  if ('title' in update && !String(update.title).trim()) return res.status(400).json({ error: 'Title is required' });
  if ('dueDate' in body) {
    const due = parseDue(body.dueDate);
    if (due === undefined) return res.status(400).json({ error: 'Invalid due date' });
    update.dueDate = due;
  }
  if ('tags' in body) update.tags = cleanTags(body.tags) ?? [];
  if ('done' in body) {
    update.done = !!body.done;
    update.completedAt = update.done ? new Date() : null;
  }
  const task = await Task.findOneAndUpdate({ _id: req.params.id, user: req.userId }, update, {
    new: true,
    runValidators: true,
  });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

router.delete('/:id', validId, async (req, res) => {
  const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ ok: true });
});

export default router;
