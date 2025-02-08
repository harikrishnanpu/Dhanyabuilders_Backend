// models/Sequence.js
import mongoose from "mongoose";

const SequenceSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  value: { type: Number, default: 1 },
});

const Sequence = mongoose.model('Sequence', SequenceSchema);
export default Sequence;
