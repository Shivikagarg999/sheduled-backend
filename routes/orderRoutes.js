const express = require('express');
const router = express.Router();
const Order = require('../models/order.js'); 
const optionalAuth = require('../middleware/optionalAuth.js')

router.post('/create-order', optionalAuth, async (req, res) => {
  try {
    const {
      pickupBuilding,
      pickupApartment,
      pickupEmirate,
      pickupArea,
      dropBuilding,
      dropApartment,
      dropEmirate,
      dropArea,
      pickupContact,
      dropContact,
      deliveryType,
      returnType,
      paymentMethod,
      amount,
      notes
    } = req.body;

    // validation
    if (!pickupBuilding || !pickupApartment || !pickupEmirate || !pickupArea ||
        !dropBuilding || !dropApartment || !dropEmirate || !dropArea ||
        !pickupContact || !dropContact || !deliveryType ||!paymentMethod ||!amount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newOrder = new Order({
      user: req.user ? req.user._id : null,  // ✅ Will be attached if user is logged in
      pickupBuilding,
      pickupApartment,
      pickupEmirate,
      pickupArea,
      dropBuilding,
      dropApartment,
      dropEmirate,
      dropArea,
      pickupContact,
      dropContact,
      deliveryType,
      returnType: returnType || 'no-return',
      paymentMethod,
      amount,
      notes: notes || ''
    });

    const savedOrder = await newOrder.save();

    res.status(201).json({
      message: 'Order created successfully',
      orderId: savedOrder._id,
      trackingNumber: savedOrder.trackingNumber
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/order/:id', async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/allOrders/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user orders' });
  }
});

router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const order = await Order.findOne({ trackingNumber: req.params.trackingNumber });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;