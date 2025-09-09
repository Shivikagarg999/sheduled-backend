const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

router.post('/payment', async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'aed',
          product_data: {
            name: `Delivery Order: ${order.trackingNumber}`,
          },
          unit_amount: Math.round(order.amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `https://sheduled.vercel.app/successpay?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://sheduled.vercel.app/failpay`,
      metadata: {
        orderId: order._id.toString(), 
      },
    });

    res.json({ redirectUrl: session.url });
  } catch (error) {
    console.error('Error creating payment session:', error);
    res.status(500).json({ error: 'Payment session creation failed' });
  }
});

// VERIFY SESSION STATUS FROM FRONTEND
router.get('/check-payment', async (req, res) => {
  const sessionId = req.query.session_id;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const isPaid = session.payment_status === 'paid';
    res.json({ paid: isPaid });
  } catch (err) {
    console.error('Error checking session status:', err);
    res.status(500).json({ paid: false });
  }
});

// STRIPE WEBHOOK
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ✅ Payment success handler
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata.orderId;

    try {
      await Order.findByIdAndUpdate(orderId, { status: 'paid' });
      console.log(`✅ Order ${orderId} marked as paid`);
    } catch (err) {
      console.error('❌ Failed to update order:', err);
      return res.status(500).send('Failed to update order status');
    }
  }

  res.status(200).end();
});

router.get('/all/payments', async (req, res) => {
  try {
    const charges = await stripe.charges.list({
      limit: 100,
    });

    res.json(charges.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;