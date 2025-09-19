import express from 'express';
import Medication from '../models/Medication.js';
import { protect } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// @desc    Get all products (medications) for billing
// @route   GET /api/products
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const products = await Medication.find({ isActive: true }).select('name price');
    res.status(200).json({
      status: 'success',
      data: products,
    });
  } catch (error) {
    logger.error('Get products error:', error);
    res.status(500).json({ status: 'error', message: 'Server Error' });
  }
});

export default router;