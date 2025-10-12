const Driver = require("../../models/driver");
const Order = require('../../models/order');
const Transaction = require('../../models/transactions');

exports.getAvailableOrders = async (req, res) => {
  try {
    const driverId = req.driver?.id;
    if (!driverId) {
      return res.status(401).json({ message: "Invalid token: driver id missing" });
    }

    // Verify driver exists and is available
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Get available orders (not assigned to any driver)
    const availableOrders = await Order.find({
      driver: null,
      status: "pending",
      paymentStatus: "completed"
    }).populate("user", "name phone");

    // Replace amount with 30% share
    const ordersWithDriverShare = availableOrders.map(order => {
      const orderObj = order.toObject();
      const totalAmount = order.amount || 0;
      const driverShare = parseFloat((totalAmount * 0.3).toFixed(2));

      return {
        ...orderObj,
        amount: driverShare,
        originalTotalAmount: totalAmount
      };
    });

    res.json({
      success: true,
      message: "Available orders fetched successfully",
      totalOrders: ordersWithDriverShare.length,
      orders: ordersWithDriverShare,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    const driverId = req.driver.id;

    // Find the order and driver
    const order = await Order.findById(orderId);
    const driver = await Driver.findById(driverId);

    if (!order || !driver) {
      return res.status(404).json({ message: 'Order or driver not found' });
    }

    // Check if driver is available
    if (!driver.isAvailable) {
      return res.status(400).json({ message: 'Driver is not available' });
    }

    // Check if order is already assigned
    if (order.driver) {
      return res.status(400).json({ message: 'Order already assigned to another driver' });
    }

    // Update order status and assign driver
    order.driver = driverId;
    order.status = 'accepted';
    await order.save();

    // Add order to driver's orders array
    driver.orders.push(orderId);
    driver.isAvailable = false; // Mark driver as busy
    await driver.save();

    res.json({ message: 'Order accepted successfully', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markAsDelivered = async (req, res) => {
  try {
    const { orderId } = req.body;
    const driverId = req.driver.id;

    const order = await Order.findById(orderId).populate('user');
    const driver = await Driver.findById(driverId);

    if (!order || !driver) {
      return res.status(404).json({ message: 'Order or driver not found' });
    }

    if (order.driver.toString() !== driverId) {
      return res.status(403).json({ message: 'Driver not assigned to this order' });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({ message: 'Order already marked as delivered' });
    }

    order.status = 'delivered';
    order.updatedAt = new Date();
    await order.save();

    const driverEarnings = (order.amount * 0.30).toFixed(2);

    driver.earnings = (
      parseFloat(driver.earnings || 0) + parseFloat(driverEarnings)
    ).toFixed(2);
    driver.isAvailable = true;
    await driver.save();

    await Transaction.create({
      driver: driver._id,
      order: order._id,
      trackingNumber: order.trackingNumber,
      amount: driverEarnings
    });

    res.json({
      message: 'Order marked as delivered successfully',
      earningsAdded: driverEarnings,
      totalEarnings: driver.earnings,
      order,
    });

  } catch (error) {
    console.error("Error in markAsDelivered:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getOngoingOrders = async (req, res) => {
  try {
    const driverId = req.driver.id;

    const ongoingOrders = await Order.find({
      driver: driverId,
      status: { $in: ["accepted", "picked_up", "in_transit"] }
    })
      .populate("user")
      .populate("driver")
      .sort({ createdAt: -1 });

    // Modify amount to 30%
    const modifiedOrders = ongoingOrders.map(order => {
      const orderObj = order.toObject();
      if (orderObj.amount) {
        orderObj.amount = orderObj.amount * 0.3;
      }
      return orderObj;
    });

    res.json({ ongoingOrders: modifiedOrders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCurrentOrders = async (req, res) => {
  try {
    const driverId = req.driver.id;

    const orders = await Order.find({
      driver: driverId,
      status: { $in: ['accepted', 'picked_up', 'in_transit'] }
    }).populate('user', 'name phone');

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTransactionHistory = async (req, res) => {
  try {
    const driverId = req.driver.id;
    const { page = 1, limit = 10 } = req.query;

    const transactions = await Transaction.find({ driver: driverId })
      .populate('order')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments({ driver: driverId });

    res.status(200).json({
      message: 'Transaction history fetched successfully',
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalTransactions: total,
      transactions
    });
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.saveDeliveryProof = async (req, res) => {
  try {
    const { orderId, deliveryNotes } = req.body;
    const driverId = req.driver.id;
    const deliveryProofImage = req.file ? req.file.path : '';

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.driver.toString() !== driverId) {
      return res.status(403).json({ message: 'Driver not assigned to this order' });
    }

    order.deliveryNotes = deliveryNotes || order.deliveryNotes;
    order.deliveryProofImage = deliveryProofImage || order.deliveryProofImage;
    order.updatedAt = new Date();

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Delivery proof saved successfully',
      order,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

function calculateDriverEarnings(orderAmount) {
  const commissionRate = 0.7;
  return orderAmount * commissionRate;
}

async function creditToWallet(driverId, amount, orderId) {
  try {
    let wallet = await Wallet.findOne({ driver: driverId });

    if (!wallet) {
      wallet = new Wallet({
        driver: driverId,
        balance: 0
      });
    }

    wallet.transactions.push({
      amount,
      type: 'credit',
      description: `Earnings from order delivery`,
      order: orderId
    });

    wallet.balance += amount;
    await wallet.save();

    return wallet;
  } catch (error) {
    throw error;
  }
}