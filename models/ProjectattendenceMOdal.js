// models/Attendance.js
import mongoose from "mongoose";

const AttendanceRecordSchema = new mongoose.Schema({
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
    isPresent: { type: Boolean, default: true },
    shifts: { type: Number, default: 1 },
    overtimeHours: { type: Number, default: 0 },
  });
  
  const AttendanceSchema = new mongoose.Schema({
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    date: { type: String, required: true }, // Format 'YYYY-MM-DD'
    attendanceRecords: [AttendanceRecordSchema],
  });

const ProjectAttendence = mongoose.model('ProjectAttendance', AttendanceSchema);
export default ProjectAttendence;
