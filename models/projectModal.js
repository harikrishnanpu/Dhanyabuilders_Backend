// models/Project.js
import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema({
  name: String,
  customerName: String,
  customerAddress: String,
  customerPhone: String,
  estimatedAmount: Number,
  startDate: Date,
  estimatedEndDate: Date,
  supervisors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
},{
    timestamps: true
});

const Project = mongoose.model('Project', ProjectSchema);
export default Project;
