// models/Task.js
import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  name: String,
  description: String,
  startDate: Date,
  endDate: Date,
  status: { type: String, enum: ['pending', 'in progress', 'completed'], default: 'pending' },
  progress: { type: Number, default: 0 }, // Percentage
});

const Tasks = mongoose.model('Task', TaskSchema);
export default Tasks;
