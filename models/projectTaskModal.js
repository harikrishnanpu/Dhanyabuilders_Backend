import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Comment Schema (shared by both Task and SubTask)
 */
const CommentSchema = new Schema({
  text: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    default: 'Anonymous',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Attachment Schema (metadata only)
 */
const AttachmentSchema = new Schema({
  fileName: String,
  fileUrl: String, // e.g., S3 or local path
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * SubTask Schema
 */
const SubTaskSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  assignedTo: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    default: 'Not Started',
    enum: ['Not Started', 'In Progress', 'Completed', 'Verified', 'Denied', 'Re-do'],
  },
  completed: {
    type: Boolean,
    default: false,
  },
  comments: [CommentSchema],
});

/**
 * Main Task Schema
 */
const TaskSchema = new Schema({
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project', // Adjust if your Project model is named differently
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    // Could be HTML or text
    type: String,
    default: '',
  },
  assignedTo: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    default: 'Not Started',
    enum: ['Not Started', 'In Progress', 'Completed', 'Verified', 'Denied', 'Re-do'],
  },
  priority: {
    type: String,
    default: 'Low',
    enum: ['Low', 'Medium', 'High', 'Critical'],
  },
  startDateTime: {
    type: Date,
    default: Date.now,
  },
  endDateTime: {
    type: Date,
    default: Date.now,
  },
  checklist: [
    {
      id: { type: String, required: true }, // for client-side drag-drop
      text: String,
      done: Boolean,
    },
  ],
  attachments: [AttachmentSchema],
  comments: [CommentSchema],
  subTasks: [SubTaskSchema],
  // Time tracking
  timeSpent: {
    type: Number,
    default: 0, // store total seconds
  },
  // Recurring tasks
  isRecurring: {
    type: Boolean,
    default: false,
  },
  recurrenceRule: {
    type: String,
    default: '', // e.g., "Every Monday"
  },
  // For "Activity Timeline"
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save hook to update updatedAt
TaskSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Task = model('ProjectTask', TaskSchema);

export default Task;
