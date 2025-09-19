import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Login user
// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide an email and password' });
  }

  try {
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    if (user.isLocked()) {
        return res.status(423).json({ success: false, message: 'Account is temporarily locked. Please try again later.' });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      await user.incrementFailedLoginAttempts();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    await user.resetLoginAttempts();

    const token = user.getSignedJwtToken();
    const userResponse = { ...user._doc };
    delete userResponse.password;
    
    res.status(200).json({ success: true, data: { user: userResponse, token } });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
router.get('/me', protect, async (req, res) => {
    const user = await User.findById(req.user.id);
    res.status(200).json({
        success: true,
        data: { user }
    });
});

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', (req, res) => {
  // In a real-world scenario with cookies, you would clear the cookie here.
  // For token-based auth, the client-side handles token removal.
  // This endpoint is useful for server-side logging or session invalidation.
  res.status(200).json({ success: true, message: 'User logged out successfully' });
});

export default router;