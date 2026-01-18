const Payout = require('../../../models/payout');
const Withdrawal = require('../../../models/withdraw');
const Driver = require('../../../models/driver');

exports.createPayout = async (req, res) => {
  try {
    const { withdrawalId, paymentMethod, referenceId, status, notes } = req.body;

    if (!withdrawalId || !paymentMethod || !referenceId) {
      return res.status(400).json({
        message: 'withdrawalId, paymentMethod, and referenceId are required'
      });
    }

    const withdrawal = await Withdrawal.findById(withdrawalId).populate('driver');
    if (!withdrawal) {
      return res.status(404).json({ message: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'approved' && withdrawal.status !== 'completed') {
      return res.status(400).json({
        message: 'Payout can only be created for approved or completed withdrawals'
      });
    }

    const existingPayout = await Payout.findOne({ withdrawal: withdrawalId });
    if (existingPayout) {
      return res.status(400).json({ message: 'Payout already exists for this withdrawal' });
    }

    const payout = new Payout({
      withdrawal: withdrawal._id,
      driver: withdrawal.driver._id,
      amount: withdrawal.amount,
      paymentMethod,
      referenceId,
      status: status || 'successful',
      notes
    });

    await payout.save();

    withdrawal.status = 'completed';
    withdrawal.processedAt = new Date();
    withdrawal.payout = payout._id;
    await withdrawal.save();

    res.status(201).json({
      success: true,
      message: 'Payout recorded successfully',
      payout
    });

  } catch (error) {
    console.error('Error creating payout:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

exports.getAllPayouts = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = {};
    if (status) query.status = status;

    const payouts = await Payout.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('driver', 'name email phone')
      .populate('withdrawal', 'amount status');

    const total = await Payout.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'Payouts fetched successfully',
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalPayouts: total,
      payouts
    });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

