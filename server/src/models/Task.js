import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    notes: { type: String, default: '', trim: true, maxlength: 2000 },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    dueDate: { type: Date, default: null },
    tags: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: 24 }],
      default: [],
      validate: [(v) => v.length <= 8, 'A task can have at most 8 tags'],
    },
    done: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Task', taskSchema);
