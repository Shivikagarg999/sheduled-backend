const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/admin/order/crud');
const adminAuth = require('../../middleware/adminAuth');

router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrderById);
router.post('/', orderController.createOrder);
router.put('/:id', orderController.updateOrder);
router.delete('/:id', orderController.deleteOrder);
//order status change
router.patch('/:id/status', orderController.updateOrderStatus);

// Filtered orders
router.get('/status/completed', orderController.getCompletedOrders);
router.get('/status/pending', orderController.getPendingOrders);
router.get('/status/ongoing', orderController.getOngoingOrders);

module.exports = router;