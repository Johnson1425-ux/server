import express from 'express';
import LabTest from '../models/LabTest.js'; // Assuming a LabTest model
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes
router.use(protect);

// Define roles for viewing and managing lab tests
const viewRoles = ['admin', 'doctor', 'nurse', 'lab_technician'];
const manageRoles = ['admin', 'doctor', 'lab_technician'];

router.route('/')
  .get(authorize(...viewRoles), async (req, res) => {
    const labTests = await LabTest.find(req.query);
    res.status(200).json({ success: true, data: labTests });
  })
  .post(authorize('admin', 'doctor'), async (req, res) => {
    // Only doctors or admins can order new tests
    const labTest = await LabTest.create(req.body);
    res.status(201).json({ success: true, data: labTest });
  });

router.route('/:id')
  .get(authorize(...viewRoles), async (req, res) => {
    const labTest = await LabTest.findById(req.params.id);
    if (!labTest) {
      return res.status(404).json({ success: false, error: 'Lab test not found' });
    }
    res.status(200).json({ success: true, data: labTest });
  })
  .put(authorize(...manageRoles), async (req, res) => {
    // Doctors or lab techs can update results
    const labTest = await LabTest.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!labTest) {
      return res.status(404).json({ success: false, error: 'Lab test not found' });
    }
    res.status(200).json({ success: true, data: labTest });
  })
  .delete(authorize('admin'), async (req, res) => {
    await LabTest.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  });

export default router;