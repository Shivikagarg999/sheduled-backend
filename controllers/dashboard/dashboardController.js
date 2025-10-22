const User = require("../../models/user");
const Driver = require("../../models/driver");
const Order = require("../../models/order");
const Transaction = require("../../models/transactions");
const Withdrawal = require("../../models/withdraw");

exports.getDashboardOverview = async (req, res) => {
  try {
   const [
  totalUsers,
  totalDrivers,
  totalOrders,
  completedOrders,
  inTransitOrders,
  totalOrderAmount,
  totalDriverEarnings,
  pendingWithdrawals,
  completedWithdrawals
] = await Promise.all([
  User.countDocuments(),
  Driver.countDocuments(),
  Order.countDocuments(),
  Order.countDocuments({ status: "delivered" }),
  Order.countDocuments({ status: "in_transit" }),
  Order.aggregate([
    { $match: { paymentStatus: "completed" } },
    { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
  ]),
  Driver.aggregate([
    { $group: { _id: null, totalEarnings: { $sum: "$earnings" } } }
  ]),
  Withdrawal.countDocuments({ status: "pending" }),
  Withdrawal.countDocuments({ status: "completed" })
]);

res.status(200).json({
  success: true,
  data: {
    users: totalUsers,
    drivers: totalDrivers,
    orders: totalOrders,
    completedOrders,
    inTransitOrders,
    totalRevenue: totalOrderAmount[0]?.totalAmount || 0,
    totalDriverEarnings: totalDriverEarnings[0]?.totalEarnings || 0,
    platformProfit:
      (totalOrderAmount[0]?.totalAmount || 0) -
      (totalDriverEarnings[0]?.totalEarnings || 0),
    withdrawals: {
      pending: pendingWithdrawals,
      completed: completedWithdrawals
    }
  }
});
  } catch (error) {
    console.error("Dashboard Overview Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getOrdersStats = async (req, res) => {
  try {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const stats = await Order.aggregate([
      { $match: { createdAt: { $gte: last7Days } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: 1 },
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error("Orders Stats Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getDriverPerformance = async (req, res) => {
  try {
    const performance = await Driver.aggregate([
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "driver",
          as: "orders"
        }
      },
      {
        $project: {
          name: 1,
          phone: 1,
          totalOrders: { $size: "$orders" },
          earnings: 1,
          isAvailable: 1
        }
      },
      { $sort: { earnings: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({ success: true, performance });
  } catch (error) {
    console.error("Driver Performance Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getRecentTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate("driver", "name phone")
      .populate("order", "trackingNumber")
      .sort({ date: -1 })
      .limit(10);

    res.status(200).json({ success: true, transactions });
  } catch (error) {
    console.error("Transactions Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
