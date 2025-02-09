import mongoose from 'mongoose';
import Counter from './counterModal.js';

const MaterialSchema = new mongoose.Schema({
  materialId: { type: Number, unique: true },
  name: { type: String, required: true, unique: true },
  unit: { type: String, required: true },
  currentStock: { type: Number, default: 0 },
  imageUrl: { type: String, default: '' },
  description: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

// Pre-save hook to auto-increment materialId on document creation.
MaterialSchema.pre('save', async function (next) {
  if (this.isNew) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { name: 'materialId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.materialId = counter.seq;
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

const Material = mongoose.model('Material', MaterialSchema);
export default Material;
