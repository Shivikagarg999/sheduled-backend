const express = require('express');
const axios = require('axios');
const router = express.Router();
const Order = require('../models/order');
const mongoose = require('mongoose');

const ZIINA_API_BASE = 'https://api-v2.ziina.com/api';
const ZIINA_ACCESS_TOKEN = process.env.ZIINA_ACCESS_TOKEN;

router.post('/payment', async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid order ID format' 
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }

    if (order.paymentStatus === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Order already paid'
      });
    }

    const response = await axios.post(
      `${ZIINA_API_BASE}/payment_intent`,
      {
        amount: Math.round(order.amount * 100),
        currency_code: 'AED',
        success_url: `https://www.sheduled.com/api/payment/success?payment_intent_id={PAYMENT_INTENT_ID}`,
        cancel_url: `https://www.sheduled.com/payment/cancel?orderId=${orderId}`,
        test: process.env.NODE_ENV === 'development',
        metadata: {
          orderId: order._id.toString(),
          trackingNumber: order.trackingNumber,
          amount: order.amount
        }
      },
      {
        headers: {
          Authorization: `Bearer ${ZIINA_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    order.transactionId = response.data.id;
    await order.save();

    res.json({ 
      success: true, 
      redirectUrl: response.data.redirect_url,
      paymentIntentId: response.data.id,
      orderId: order._id
    });

  } catch (error) {
    console.error('Payment creation error:', error.message);
    
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data || 'Payment gateway error';
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.post('/payment-test', async (req, res) => {
  try {
    const response = await axios.post(
      `${ZIINA_API_BASE}/payment_intent`,
      {
        amount: 2000,
        currency_code: 'AED',
        success_url: 'https://www.sheduled.com/api/payment/success?payment_intent_id={PAYMENT_INTENT_ID}',
        cancel_url: 'https://www.sheduled.com/payment/cancel',
        test: true,
        metadata: {
          orderId: 'test_order_123',
          test: true
        }
      },
      {
        headers: {
          Authorization: `Bearer ${ZIINA_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    res.json({ 
      success: true, 
      data: response.data,
      redirectUrl: response.data.redirect_url 
    });
    
  } catch (error) {
    console.error('Ziina API error:', error.message);
    res.status(error.response?.status || 500).json({ 
      success: false, 
      error: error.response?.data || error.message 
    });
  }
});

router.get('/payment/success', async (req, res) => {
  try {
    const { payment_intent_id } = req.query;
    
    if (!payment_intent_id) {
      return res.redirect('/payment-error?message=Missing payment intent ID');
    }

    const verification = await axios.get(
      `${ZIINA_API_BASE}/payment_intent/${payment_intent_id}`,
      {
        headers: {
          Authorization: `Bearer ${ZIINA_ACCESS_TOKEN}`
        },
        timeout: 10000
      }
    );
    
    const paymentData = verification.data;
    
    if (paymentData.status === 'succeeded') {
      const orderId = paymentData.metadata?.orderId;
      
      if (!orderId) {
        throw new Error('No orderId in payment metadata');
      }
      
      await Order.findByIdAndUpdate(orderId, { 
        paymentStatus: 'completed',
        transactionId: payment_intent_id,
        status: 'accepted',
        updatedAt: new Date()
      });
      
      const trackingNumber = paymentData.metadata?.trackingNumber || '';
      res.redirect(`/thank-you?order=${orderId}&tracking=${trackingNumber}`);
      
    } else if (paymentData.status === 'requires_payment_instrument') {
      res.redirect('/payment-pending');
    } else {
      res.redirect('/payment-failed');
    }
    
  } catch (error) {
    console.error('Payment verification failed:', error.message);
    res.redirect(`/payment-error?message=${encodeURIComponent(error.message)}`);
  }
});

router.get('/payment/status/:orderId', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }

    let ziinaStatus = null;
    if (order.paymentStatus === 'pending' && order.transactionId) {
      try {
        const verification = await axios.get(
          `${ZIINA_API_BASE}/payment_intent/${order.transactionId}`,
          {
            headers: {
              Authorization: `Bearer ${ZIINA_ACCESS_TOKEN}`
            }
          }
        );
        ziinaStatus = verification.data.status;
        
        if (ziinaStatus === 'succeeded' && order.paymentStatus !== 'completed') {
          order.paymentStatus = 'completed';
          order.status = 'accepted';
          await order.save();
        }
      } catch (verifyError) {
        console.warn('Ziina verification failed:', verifyError.message);
      }
    }

    res.json({
      success: true,
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      transactionId: order.transactionId,
      ziinaStatus: ziinaStatus,
      trackingNumber: order.trackingNumber,
      amount: order.amount,
      updatedAt: order.updatedAt
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check payment status' 
    });
  }
});

router.post('/payment/webhook/ziina', async (req, res) => {
  const event = req.body;
  
  if (!event.type || !event.data) {
    return res.status(400).json({ error: 'Invalid webhook data' });
  }
  
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data;
        const orderId = paymentIntent.metadata?.orderId;
        
        if (orderId) {
          await Order.findByIdAndUpdate(orderId, {
            paymentStatus: 'completed',
            transactionId: paymentIntent.id,
            status: 'accepted',
            updatedAt: new Date()
          });
          console.log(`Webhook: Payment succeeded for order ${orderId}`);
        }
        break;
        
      case 'payment_intent.payment_failed':
        const failedPayment = event.data;
        const failedOrderId = failedPayment.metadata?.orderId;
        
        if (failedOrderId) {
          await Order.findByIdAndUpdate(failedOrderId, {
            paymentStatus: 'failed',
            updatedAt: new Date()
          });
          console.log(`Webhook: Payment failed for order ${failedOrderId}`);
        }
        break;
        
      default:
        console.log(`Webhook: Unhandled event type ${event.type}`);
    }
    
    res.json({ received: true });
    
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

router.get('/payment/cancel', async (req, res) => {
  try {
    const { orderId } = req.query;
    
    if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'failed',
        updatedAt: new Date()
      });
    }
    
    res.redirect('/payment-cancelled');
    
  } catch (error) {
    console.error('Cancel handler error:', error.message);
    res.redirect('/payment-error');
  }
});

router.get('/all/payments', async (req, res) => {
  try {
    const orders = await Order.find({ 
      paymentStatus: { $in: ['completed', 'failed'] }
    })
    .sort({ createdAt: -1 })
    .select('trackingNumber amount paymentStatus transactionId createdAt')
    .limit(100)
    .lean();
    
    const summary = {
      total: orders.length,
      completed: orders.filter(o => o.paymentStatus === 'completed').length,
      failed: orders.filter(o => o.paymentStatus === 'failed').length,
      totalAmount: orders
        .filter(o => o.paymentStatus === 'completed')
        .reduce((sum, order) => sum + (order.amount || 0), 0)
    };
    
    res.json({
      success: true,
      summary,
      payments: orders
    });
    
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch payments' 
    });
  }
});

module.exports = router;