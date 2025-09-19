import express from 'express';
import Medication from '../models/Medication.js'; // Assuming a Medication model
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes
router.use(protect);

// Define roles for medication management
const viewRoles = ['admin', 'doctor', 'nurse', 'pharmacist'];
const manageRoles = ['admin', 'doctor', 'pharmacist'];
const prescribeRoles = ['admin', 'doctor'];

router.route('/')
  .get(authorize(...viewRoles), async (req, res) => {
    const medications = await Medication.find(req.query);
    res.status(200).json({ success: true, data: medications });
  })
  .post(authorize(...prescribeRoles), async (req, res) => {
    // Only doctors can prescribe new medications
    const medication = await Medication.create(req.body);
    res.status(201).json({ success: true, data: medication });
  });

router.route('/:id')
  .get(authorize(...viewRoles), async (req, res) => {
    const medication = await Medication.findById(req.params.id);
    if (!medication) {
      return res.status(404).json({ success: false, error: 'Medication not found' });
    }
    res.status(200).json({ success: true, data: medication });
  })
  .put(authorize(...manageRoles), async (req, res) => {
    // Doctors or pharmacists can update medication info (e.g., dispense status)
    const medication = await Medication.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!medication) {
      return res.status(404).json({ success: false, error: 'Medication not found' });
    }
    res.status(200).json({ success: true, data: medication });
  })
  .delete(authorize('admin'), async (req, res) => {
    await Medication.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  });

export default router;