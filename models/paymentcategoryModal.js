// models/PaymentCategory.js
import mongoose from "mongoose";
const PaymentCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});

const PaymentCategory = mongoose.model('PaymentCategory', PaymentCategorySchema);
export default PaymentCategory;
