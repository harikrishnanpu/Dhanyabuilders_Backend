// models/Purchase.js
import mongoose from "mongoose";

const purchaseSchema = mongoose.Schema({
  sellerName: { type: String, required: true },
  invoiceNo: { type: String, required: true },
  purchaseId: { type: String },
  sellerAddress: { type: String },
  sellerGst: { type: String },
  billingDate: { type: Date },
  invoiceDate: { type: Date },
  items: [
    {
      itemId: { type: String, required: true },
      name: { type: String },
      quantity: { type: Number },
      pUnit: { type: String },
      brand: { type: String },
      category: { type: String },
      price: { type: Number },
      sUnit: { type: String },
      psRatio: { type: String },
      length: { type: String },
      breadth: { type: String },
      size: { type: String },
    },
  ],
}, {
  timestamps: true,
});

const Purchase = mongoose.model('Purchase', purchaseSchema);

export default Purchase