import express from 'express';
import { body, validationResult } from 'express-validator';
import Visit from '../models/Visit.js';
import { protect, authorize } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Protect all routes in this file
router.use(protect);

// @desc    Get all visits (or doctor's own queue)
// @route   GET /api/visits
router.get('/', authorize('admin', 'doctor', 'receptionist'), async (req, res) => {
    try {
        const query = {};
        // If the user is a doctor, only show their active visits
        if (req.user.role === 'doctor') {
            query.doctor = req.user.id;
            query.status = 'active';
        }
        const visits = await Visit.find(query)
            .populate('patient', 'firstName lastName')
            .populate('doctor', 'firstName lastName');
        res.status(200).json({ status: 'success', data: visits });
    } catch (error) {
        logger.error('Get visits error:', error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
});

// @desc    Get a single visit by ID
// @route   GET /api/visits/:id
router.get('/:id', authorize('admin', 'doctor'), async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.id)
            .populate('patient')
            .populate('doctor');
        if (!visit) {
            return res.status(404).json({ status: 'error', message: 'Visit not found' });
        }
        res.status(200).json({ status: 'success', data: visit });
    } catch (error) {
        logger.error('Get single visit error:', error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
});


// @desc    Create a new visit
// @route   POST /api/visits
// @access  Private (Admin, Receptionist)
router.post('/', authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const { patientId, doctorId, visitDate, reason, status, type } = req.body;

    const newVisit = new Visit({
      patient: patientId,
      doctor: doctorId,
      visitDate,
      reason,
      status,
      type,
      startedBy: req.user.id,
    });

    const visit = await newVisit.save();

    res.status(201).json({
      status: 'success',
      data: visit,
    });
  } catch (error) {
    logger.error('Create visit error:', error);
    // Send back a more specific error message
    res.status(400).json({ status: 'error', message: error.message });
  }
});


// @desc    Update a visit with clinical data
// @route   PUT /api/visits/:id/clinical
router.put('/:id/clinical', authorize('doctor'), async (req, res) => {
    try {
        const visit = await Visit.findById(req.params.id);
        if (!visit) {
            return res.status(404).json({ message: 'Visit not found' });
        }

        const { diagnosis, labOrders, prescriptions } = req.body;

        if (diagnosis) visit.diagnosis = diagnosis;
        if (labOrders) visit.labOrders.push(...labOrders);
        if (prescriptions) visit.prescriptions.push(...prescriptions);
        
        // Optionally, update visit status
        if(req.body.status) visit.status = req.body.status;

        await visit.save();
        res.status(200).json({ status: 'success', data: visit });

    } catch (error) {
        logger.error('Update clinical data error:', error);
        res.status(400).json({ message: 'Failed to update clinical data', error: error.message });
    }
});


export default router;