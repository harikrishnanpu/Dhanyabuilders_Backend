// models/Material.js
import mongoose from "mongoose"; 

const MaterialSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  unit: { type: String, required: true },
  stock: { type: Number, default: 0}
});

const Material = mongoose.model('Material', MaterialSchema);
export default Material;
