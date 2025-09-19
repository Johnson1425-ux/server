import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot be more than 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please add a valid phone number']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: [true, 'Gender is required']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  patientId: {
    type: String
  },
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  height: {
    value: Number,
    unit: {
      type: String,
      enum: ['cm', 'ft'],
      default: 'cm'
    }
  },
  weight: {
    value: Number,
    unit: {
      type: String,
      enum: ['kg', 'lbs'],
      default: 'kg'
    }
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
    email: String,
    address: String
  },
  medicalHistory: [String],
  allergies: [String],
  medications: [{
    name: {
      type: String,
      required: true
    },
    dosage: String,
    frequency: String,
    startDate: Date,
    endDate: Date,
    prescribedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  insurance: {
    provider: String,
    policyNumber: String,
    groupNumber: String,
    effectiveDate: Date,
    expiryDate: Date,
    coverageType: {
      type: String,
      enum: ['individual', 'family', 'group'],
      default: 'individual'
    },
    copay: Number,
    deductible: Number
  },
  familyHistory: [{
    condition: String,
    relationship: String,
    notes: String
  }],
  lifestyle: {
    smoking: {
      status: {
        type: String,
        enum: ['never', 'former', 'current'],
        default: 'never'
      },
      details: String
    },
    alcohol: {
      status: {
        type: String,
        enum: ['never', 'occasional', 'moderate', 'heavy'],
        default: 'never'
      },
      details: String
    },
    exercise: {
      frequency: {
        type: String,
        enum: ['never', 'rarely', 'sometimes', 'regularly'],
        default: 'never'
      },
      type: String
    },
    diet: String
  },
  vitalSigns: [{
    date: {
      type: Date,
      default: Date.now
    },
    bloodPressure: {
      systolic: Number,
      diastolic: Number
    },
    heartRate: Number,
    temperature: Number,
    respiratoryRate: Number,
    oxygenSaturation: Number,
    weight: Number,
    height: Number,
    bmi: Number,
    notes: String,
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  documents: [{
    title: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['lab_report', 'imaging', 'prescription', 'consent_form', 'other'],
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }],
  notes: [{
    content: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ['general', 'medical', 'nursing', 'pharmacy', 'other'],
      default: 'general'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedNurse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'discharged'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for age
patientSchema.virtual('age').get(function() {
  if (this.dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
  return null;
});

// Virtual for full name
patientSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Indexes for better query performance
patientSchema.index({ patientId: 1 });
patientSchema.index({ email: 1 }, { unique: true });
patientSchema.index({ phone: 1 });
patientSchema.index({ status: 1 });
patientSchema.index({ assignedDoctor: 1 });
patientSchema.index({ assignedNurse: 1 });
patientSchema.index({ 'insurance.provider': 1 });

// Pre-save middleware to generate patient ID
patientSchema.pre('save', async function(next) {
  if (this.isNew && !this.patientId) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    this.patientId = `P${year}${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

// Static method to get patient statistics
patientSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalPatients: { $sum: 1 },
        activePatients: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        inactivePatients: {
          $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
        }
      }
    }
  ]);

  return stats[0] || { totalPatients: 0, activePatients: 0, inactivePatients: 0 };
};

// Instance method to add vital signs
patientSchema.methods.addVitalSigns = function(vitalData) {
  this.vitalSigns.push(vitalData);
  return this.save();
};

// Instance method to add medical history
patientSchema.methods.addMedicalHistory = function(historyData) {
  this.medicalHistory.push(historyData);
  return this.save();
};

// Instance method to add allergy
patientSchema.methods.addAllergy = function(allergyData) {
  this.allergies.push(allergyData);
  return this.save();
};

// Instance method to add medication
patientSchema.methods.addMedication = function(medicationData) {
  this.medications.push(medicationData);
  return this.save();
};

// Instance method to add note
patientSchema.methods.addNote = function(noteData) {
  this.notes.push(noteData);
  return this.save();
};

export default mongoose.model('Patient', patientSchema);
