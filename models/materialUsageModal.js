// models/MaterialUsage.js
import mongoose from 'mongoose';

const MaterialUsageSchema = new mongoose.Schema(
  {
    usageId: { type: String, unique: true, required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    supervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    items: [
      {
        material: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true },
        quantity: { type: Number, required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to update material stock
MaterialUsageSchema.pre('save', async function (next) {
  try {
    const usage = this;
    for (let item of usage.items) {
      const material = await mongoose.model('Material').findById(item.material);
      if (!material) {
        throw new Error(`Material with ID ${item.material} not found`);
      }
      if ((material.stock || 0) < item.quantity) {
        throw new Error(`Insufficient stock for material ${material.name}`);
      }
      material.stock = (material.stock || 0) - item.quantity;
      await material.save();
    }
    next();
  } catch (error) {
    next(error);
  }
});

const MaterialUsage = mongoose.model('MaterialUsage', MaterialUsageSchema);
export default MaterialUsage;
