// models/Transaction.js
import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    supervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['in', 'out' , 'transfer'], required: true },
    amount: { type: Number, required: true },
    paymentFrom: { type: String, required: true },
    paymentMethod: { type: String, required: true },
    paymentCategory: { type: String, required: true },
    remarks: String,
    date: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  });

const Transactions = mongoose.model('Transaction', TransactionSchema);
export default Transactions;
