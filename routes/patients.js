import express from 'express';
import { body, validationResult } from 'express-validator';
import Patient from '../models/Patient.js';
import { protect, authorize } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Helper function to clean insurance data
const cleanInsuranceData = (data) => {
  if (data.insurance) {
    if (!data.insurance.provider || data.insurance.provider === '') {
      data.insurance.provider = null;
    }
    if (!data.insurance.membershipNumber || data.insurance.membershipNumber === '') {
      data.insurance.membershipNumber = null;
    }
  }
  return data;
};

// @desc    Search patients (Updated to support 'q' query parameter)
// @route   GET /api/patients/search
// @access  Private (Admin, Doctor, Nurse, Receptionist, Pharmacist)
router.get('/search', protect, authorize('admin', 'doctor', 'receptionist', 'pharmacist', 'nurse'), async (req, res) => {
  try {
    const { q, name } = req.query;
    const searchQuery = q || name;
    
    if (!searchQuery) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query is required'
      });
    }

    const patients = await Patient.find({
      $or: [
        { firstName: { $regex: searchQuery, $options: 'i' } },
        { middleName: { $regex: searchQuery, $options: 'i' } },
        { lastName: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } },
        { phone: { $regex: searchQuery, $options: 'i' } },
        { patientId: { $regex: searchQuery, $options: 'i' } }
      ]
    }).limit(10);

    res.status(200).json({
      status: 'success',
      count: patients.length,
      patients: patients,
      data: patients
    });
  } catch (error) {
    logger.error('Search patients error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Get all patients
// @route   GET /api/patients
// @access  Private (Admin, Doctor, Nurse)
router.get('/', protect, authorize('admin', 'doctor', 'receptionist', 'pharmacist'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Patient.countDocuments();

    const patients = await Patient.find()
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      status: 'success',
      count: patients.length,
      pagination,
      data: patients
    });
  } catch (error) {
    logger.error('Get patients error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Get single patient
// @route   GET /api/patients/:id
// @access  Private (Admin, Doctor, Nurse)
router.get('/:id', protect, authorize('admin', 'doctor', 'receptionist'), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: patient
    });
  } catch (error) {
    logger.error('Get patient error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Create new patient
// @route   POST /api/patients
// @access  Private (Admin, Doctor, Nurse, Receptionist)
router.post('/', protect, authorize('admin', 'receptionist'), [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),
  body('middleName').trim().isLength({ min:2, max: 50 }).withMessage('Middle name must be between 2 and 50 characters'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('phone').matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Please provide a valid phone number'),
  body('dateOfBirth').isISO8601().withMessage('Please provide a valid date of birth'),
  body('gender').isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
  body('bloodType').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Invalid blood type'),
  body('maritalStatus').optional().isIn(['Single', 'Married', 'Divorced', 'Widowed', 'Other']).withMessage('Invalid marital status'),
  body('address.country').optional().isIn(['Tanzania, United Republic of']).withMessage('Please provide a valid country'),
  body('address.region').optional().trim().isLength({ min: 2, max: 100 }),
  body('address.district').optional().trim().isLength({ min: 2, max: 100 }),
  body('address.ward').optional().trim().isLength({ min: 2, max: 100 }),
  body('address.street').optional().trim().isLength({ min: 2, max: 100 }),
  body('emergencyContact.name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Emergency contact name must be between 2 and 100 characters'),
  body('emergencyContact.phone').optional().matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Please provide a valid emergency contact phone number'),
  body('emergencyContact.relationship').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Emergency contact relationship must be between 2 and 50 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Clean insurance data
    let patientData = cleanInsuranceData(req.body);

    // Check if patient already exists with same email or phone
    const existingPatient = await Patient.findOne({
      $or: [
        { email: patientData.email },
        { phone: patientData.phone }
      ]
    });

    if (existingPatient) {
      return res.status(400).json({
        status: 'error',
        message: 'Patient already exists with this email or phone number'
      });
    }

    const patient = await Patient.create(patientData);

    res.status(201).json({
      status: 'success',
      message: 'Patient created successfully',
      data: patient
    });
  } catch (error) {
    logger.error('Create patient error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Update patient
// @route   PUT /api/patients/:id
// @access  Private (Admin, Receptionist)
router.put('/:id', protect, authorize('admin', 'receptionist'), [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),
  body('middleName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Middle name must be between 2 and 50 characters'),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('phone').optional().matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Please provide a valid phone number'),
  body('dateOfBirth').optional().isISO8601().withMessage('Please provide a valid date of birth'),
  body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
  body('bloodType').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Invalid blood type'),
  body('maritalStatus').optional().isIn(['Single', 'Married', 'Divorced', 'Widowed', 'Other']).withMessage('Invalid marital status'),
  body('address.country').optional().isIn(['Tanzania, United Republic of']).withMessage('Please provide a valid country'),
  body('address.region').optional().trim().isLength({ min: 2, max: 100 }),
  body('address.district').optional().trim().isLength({ min: 2, max: 100 }),
  body('address.ward').optional().trim().isLength({ min: 2, max: 100 }),
  body('address.street').optional().trim().isLength({ min: 2, max: 100 }),
  body('emergencyContact.name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Emergency contact name must be between 2 and 100 characters'),
  body('emergencyContact.phone').optional().matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Please provide a valid emergency contact phone number'),
  body('emergencyContact.relationship').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Emergency contact relationship must be between 2 and 50 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    let patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient not found'
      });
    }

    // Check if email or phone is being changed and if it's already taken
    if ((req.body.email && req.body.email !== patient.email) || 
        (req.body.phone && req.body.phone !== patient.phone)) {
      const existingPatient = await Patient.findOne({
        $or: [
          { email: req.body.email },
          { phone: req.body.phone }
        ],
        _id: { $ne: req.params.id }
      });

      if (existingPatient) {
        return res.status(400).json({
          status: 'error',
          message: 'Email or phone number is already taken by another patient'
        });
      }
    }

    // Clean insurance data before updating
    const updateData = cleanInsuranceData(req.body);

    patient = await Patient.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      status: 'success',
      data: patient
    });
  } catch (error) {
    logger.error('Update patient error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Delete patient
// @route   DELETE /api/patients/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        status: 'error',
        message: 'Patient not found'
      });
    }

    await patient.deleteOne();

    res.status(200).json({
      status: 'success',
      message: 'Patient deleted successfully'
    });
  } catch (error) {
    logger.error('Delete patient error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

export default router;