import mongoose from 'mongoose';

const medicationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  form: { // e.g., Tablet, Syrup, Injection
    type: String,
  },
  strength: { // e.g., 500mg, 10ml
    type: String,
  }
}, { timestamps: true });

export default mongoose.model('Medication', medicationSchema);