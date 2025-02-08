// models/MaterialReceipt.js
import mongoose from 'mongoose';

const MaterialReceiptSchema = new mongoose.Schema(
  {
    receiptId: { type: String, unique: true, required: true },
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
MaterialReceiptSchema.pre('save', async function (next) {
  try {
    const receipt = this;
    for (let item of receipt.items) {
      const material = await mongoose.model('Material').findById(item.material);
      if (!material) {
        throw new Error(`Material with ID ${item.material} not found`);
      }
      material.stock = (material.stock || 0) + item.quantity;
      await material.save();
    }
    next();
  } catch (error) {
    next(error);
  }
});

const MaterialReceipt = mongoose.model('MaterialReceipt', MaterialReceiptSchema);
export default MaterialReceipt;
