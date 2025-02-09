// models/Project.js
import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const subProgressItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  percentage: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const progressItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  // "percentage" can be auto-computed from subProgress,
  // or manually set if no subProgress. We'll keep it as a field.
  percentage: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },

  // Sub-progress items
  subProgress: [subProgressItemSchema],

  // Comments on this main progress
  comments: [commentSchema],
});

const ProjectSchema = new mongoose.Schema({
  name: String,
  customerName: String,
  customerAddress: String,
  customerPhone: String,
  estimatedAmount: Number,
  startDate: Date,
  estimatedEndDate: Date,

  // Main progress array
  progress: [progressItemSchema],

  supervisors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
}, {
  timestamps: true
});

const Project = mongoose.model('Project', ProjectSchema);
export default Project;
