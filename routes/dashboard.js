import express from 'express';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes and authorize staff
router.use(protect, authorize('admin', 'doctor', 'nurse', 'receptionist'));

router.get('/overview', async (req, res) => {
  res.status(200).json({ success: true, data: { overview: 'data' } });
});

router.get('/statistics', async (req, res) => {
  res.status(200).json({ success: true, data: { statistics: 'data' } });
});

router.get('/recent-activity', async (req, res) => {
  res.status(200).json({ success: true, data: { activity: [] } });
});

router.get('/charts', async (req, res) => {
  res.status(200).json({ success: true, data: { charts: 'data' } });
});

export default router;