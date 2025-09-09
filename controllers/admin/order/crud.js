const Order = require('../../../models/order');

// 🔹 Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, message: 'Orders fetched successfully', data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders', error: error.message });
  }
};

// 🔹 Get single order
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    res.status(200).json({ success: true, message: 'Order fetched successfully', data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch order', error: error.message });
  }
};

// 🔹 Create order
exports.createOrder = async (req, res) => {
  try {
    const newOrder = new Order(req.body);
    await newOrder.save();

    res.status(201).json({ success: true, message: 'Order created successfully', data: newOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create order', error: error.message });
  }
};

// 🔹 Update order
exports.updateOrder = async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedOrder) return res.status(404).json({ success: false, message: 'Order not found' });

    res.status(200).json({ success: true, message: 'Order updated successfully', data: updatedOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update order', error: error.message });
  }
};

// 🔹 Delete order
exports.deleteOrder = async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Order not found' });

    res.status(200).json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete order', error: error.message });
  }
};

// 🔹 Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const orderId = req.params.id;

    // Validate status values against enum options
    const validOrderStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    const validPaymentStatuses = ['pending', 'completed', 'failed', 'refunded'];

    if (status && !validOrderStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid order status' 
      });
    }

    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid payment status' 
      });
    }

    const updateFields = { 
      updatedAt: new Date() 
    };

    if (status) updateFields.status = status;
    if (paymentStatus) updateFields.paymentStatus = paymentStatus;

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      updateFields,
      { new: true }
    ).populate('user driver');

    if (!updatedOrder) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Order status updated successfully', 
      data: updatedOrder 
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update order status', 
      error: error.message 
    });
  }
};

// 🔹 Get all completed orders
exports.getCompletedOrders = async (req, res) => {
  try {
    const orders = await Order.find({ status: 'delivered' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, message: 'Completed orders fetched successfully', data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch completed orders', error: error.message });
  }
};

// 🔹 Get all pending orders
exports.getPendingOrders = async (req, res) => {
  try {
    const orders = await Order.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, message: 'Pending orders fetched successfully', data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch pending orders', error: error.message });
  }
};

// 🔹 Get all ongoing orders (processing + shipped)
exports.getOngoingOrders = async (req, res) => {
  try {
    const orders = await Order.find({ status: { $in: ['processing', 'shipped'] } }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, message: 'Ongoing orders fetched successfully', data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch ongoing orders', error: error.message });
  }
};
