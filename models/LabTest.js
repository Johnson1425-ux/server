import mongoose from 'mongoose';

const labTestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['Hematology', 'Chemistry', 'Microbiology', 'Imaging', 'Other'],
  },
  code: { // Optional test code like LOINC
    type: String,
    unique: true,
    sparse: true
  }
}, { timestamps: true });

export default mongoose.model('LabTest', labTestSchema);