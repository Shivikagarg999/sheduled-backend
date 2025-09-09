const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Order= require('../models/order')
const auth = require("../middleware/auth")
const optionalAuth = require("../middleware/optionalAuth")

// 💎AUTH
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, googleId } = req.body;

    const isGoogleRegister = !!(googleId && email);
    const isDirectRegister = !!(phone && password);

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required.' });
    }

    if (!isGoogleRegister && !isDirectRegister) {
      return res.status(400).json({ message: 'Provide either phone & password OR googleId.' });
    }

    if (isGoogleRegister && isDirectRegister) {
      return res.status(400).json({ message: 'Use only one method to register.' });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (isGoogleRegister && !existingUser.googleId) {
        return res.status(400).json({ message: 'Already registered via phone. Please login with phone.' });
      }

      if (isDirectRegister && existingUser.googleId) {
        return res.status(400).json({ message: 'Already registered via Google. Please login with Google.' });
      }

      return res.status(400).json({ message: 'User already exists.' });
    }

    let hashedPassword = null;
    if (isDirectRegister) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const user = await User.create({
      name,
      email,
      phone: isDirectRegister ? phone : null,
      password: hashedPassword,
      googleId: isGoogleRegister ? googleId : null,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        authMethod: isGoogleRegister ? 'google' : 'direct'
      }
    });
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

  const token = jwt.sign(
  {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    googleId: user.googleId,
    addresses: user.addresses
  },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/google-login', async (req, res) => {
  try {
    const { email, googleId, name } = req.body;

    if (!email || !googleId || !name) {
      return res.status(400).json({ message: 'Missing Google credentials' });
    }

    let user = await User.findOne({ email });

    if (user) {
      if (!user.googleId) {
        return res.status(400).json({ message: 'User exists via direct signup. Use password to login.' });
      }
    } else {
      user = await User.create({
        name,
        email,
        googleId,
        phone: null,
        password: null
      });
    }
const token = jwt.sign(
  {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    googleId: user.googleId,
    addresses: user.addresses
  },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);


    res.status(200).json({
      message: 'Google login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        method: 'google'
      }
    });
  } catch (err) {
    console.error('Google Login Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 💎PROFILE

// Get
router.get('/profile', auth, (req, res) => {
  res.json({ user: req.user });
});

// Edit user profile
router.put('/edit-profile', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, addresses } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // If updating phone, check uniqueness
    if (phone && phone !== user.phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(400).json({ message: 'Phone number already in use' });
      }
      user.phone = phone;
    }

    if (name) user.name = name;
    if (addresses) user.addresses = addresses;

    user.updatedAt = Date.now();
    await user.save();

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        addresses: user.addresses
      }
    });
  } catch (err) {
    console.error('Edit Profile Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

//💎 ORDERS

// All Orders for a user
router.get('/allOrders/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user orders' });
  }
});

module.exports = router;