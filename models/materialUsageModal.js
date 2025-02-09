// models/MaterialUsage.js
import mongoose from 'mongoose';

const MaterialUsageSchema = new mongoose.Schema({
  usageId: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  supervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: Date,
  items: [
    {
      material: { type: mongoose.Schema.Types.ObjectId, ref: 'Material' },
      quantity: Number,
      // Comments array:
      comments: [
        {
          text: String,
          authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          authorName: String,
          createdAt: { type: Date, default: Date.now },
        },
      ],
    },
  ],
});


// Pre-save hook to update material stoc

const MaterialUsage = mongoose.model('MaterialUsage', MaterialUsageSchema);
export default MaterialUsage;
