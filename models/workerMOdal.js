// models/Worker.js
import mongoose from "mongoose";
const WorkerSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  name: String,
  contactNumber: String,
  category: String,
  shiftSalary: Number,
});

const Worker = mongoose.model('Worker', WorkerSchema);
export default Worker;
