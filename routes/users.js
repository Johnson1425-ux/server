import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin only)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await User.countDocuments();

    const users = await User.find()
      .select('-password')
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Pagination result
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
      count: users.length,
      pagination,
      data: users
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Create a new user
// @route   POST /api/users
// @access  Private (Admin only)
router.post(
  '/',
  protect,
  authorize('admin'),
  [
    body('firstName', 'First name is required').not().isEmpty(),
    body('lastName', 'Last name is required').not().isEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password must be at least 8 characters').isLength({ min: 8 }),
    body('role', 'Role is required').not().isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
      let user = await User.findOne({ email });

      if (user) {
        return res.status(400).json({
          status: 'error',
          message: 'User already exists'
        });
      }

      user = new User(req.body);
      await user.save();

      // Don't send the password back
      const userResponse = { ...user._doc };
      delete userResponse.password;

      res.status(201).json({
        status: 'success',
        message: 'User created successfully',
        data: userResponse
      });
    } catch (error) {
      logger.error('Create user error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Server error'
      });
    }
  }
);

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    // req.user.id comes from the protect middleware after token verification
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: user
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Update current user's preferences (e.g., theme)
// @route   PUT /api/users/preferences
// @access  Private
router.put('/preferences', protect, async (req, res) => {
    try {
        // Find the user and update only the preferences field
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { preferences: req.body },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            status: 'success',
            data: { preferences: user.preferences }
        });
    } catch (error) {
        logger.error('Update preferences error:', error);
        res.status(500).json({ status: 'error', message: 'Server Error' });
    }
});

// @desc    Update current user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('phone').optional().matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Please provide a valid phone number'),
  body('gender').optional().isIn(['male', 'female', 'other', 'prefer_not_to_say']).withMessage('Invalid gender'),
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

    // Extract allowed fields for profile update
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      dateOfBirth,
      gender,
      department,
      specialization,
      licenseNumber
    } = req.body;

    // Build update object with only provided fields
    const updateFields = {};
    
    if (firstName !== undefined) updateFields.firstName = firstName;
    if (lastName !== undefined) updateFields.lastName = lastName;
    if (email !== undefined) updateFields.email = email;
    if (phone !== undefined) updateFields.phone = phone;
    if (address !== undefined) updateFields.address = address;
    if (dateOfBirth !== undefined) updateFields.dateOfBirth = dateOfBirth;
    if (gender !== undefined) updateFields.gender = gender;
    if (department !== undefined) updateFields.department = department;
    if (specialization !== undefined) updateFields.specialization = specialization;
    if (licenseNumber !== undefined) updateFields.licenseNumber = licenseNumber;

    // Check if email is being changed and if it's already taken
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Email is already taken',
          errors: [{
            field: 'email',
            message: 'Email is already taken'
          }]
        });
      }
    }

    // req.user.id comes from the protect middleware after token verification
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateFields,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: user,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    logger.error('Update user error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(val => ({
        field: val.path,
        message: val.message
      }));
      
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors
      });
    }
    
    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already exists',
        errors: [{
          field: 'email',
          message: 'Email already exists'
        }]
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin or same user)
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check if user is authorized to view this user
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to access this user'
      });
    }

    res.status(200).json({
      status: 'success',
      data: user
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (req.user.id === req.params.id) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete your own account'
      });
    }

    await user.deleteOne(); // Updated method name

    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @desc    Deactivate/Activate user
// @route   PATCH /api/users/:id/toggle-status
// @access  Private (Admin only)
router.patch('/:id/toggle-status', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Prevent admin from deactivating themselves
    if (req.user.id === req.params.id) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot deactivate your own account'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: user._id,
        isActive: user.isActive
      }
    });
  } catch (error) {
    logger.error('Toggle user status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

export default router;