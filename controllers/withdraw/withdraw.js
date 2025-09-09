const Withdrawal = require('../../models/withdraw');
const Transaction = require('../../models/transactions');
const Driver = require('../../models/driver');

// Update driver's bank details
exports.updateBankDetails = async (req, res) => {
  try {
    const driverId = req.driver.id;
    const { 
      accountHolderName, 
      accountNumber, 
      iban, 
      bankName 
    } = req.body;

    if (!accountHolderName || !accountNumber || !iban || !bankName) {
      return res.status(400).json({ 
        message: 'All fields are required: accountHolderName, accountNumber, iban, bankName' 
      });
    }

    const driver = await Driver.findByIdAndUpdate(
      driverId,
      {
        bankDetails: {
          accountHolderName,
          accountNumber,
          iban,
          bankName,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    res.status(200).json({
      message: 'Bank details updated successfully',
      bankDetails: driver.bankDetails
    });

  } catch (error) {
    console.error('Bank details update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get driver's bank details
exports.getBankDetails = async (req, res) => {
  try {
    const driverId = req.driver.id;
    
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.status(200).json({
      message: 'Bank details fetched successfully',
      bankDetails: driver.bankDetails || null
    });
  } catch (error) {
    console.error('Error fetching bank details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Request a withdrawal
exports.requestWithdrawal = async (req, res) => {
  try {
    const driverId = req.driver.id;
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ 
        message: 'Amount is required' 
      });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({ message: 'Invalid withdrawal amount' });
    }

    // Get driver and check balance and bank details
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    // Check if bank details are set
    if (!driver.bankDetails || !driver.bankDetails.accountHolderName) {
      return res.status(400).json({ 
        message: 'Bank details not set. Please update your bank details before requesting a withdrawal.' 
      });
    }

    const currentEarnings = parseFloat(driver.earnings || 0);
    if (currentEarnings < amount) {
      return res.status(400).json({ 
        message: 'Insufficient earnings for withdrawal',
        currentEarnings,
        requestedAmount: amount
      });
    }

    const minWithdrawal = 100;
    if (amount < minWithdrawal) {
      return res.status(400).json({ 
        message: `Minimum withdrawal amount is ${minWithdrawal} AED`,
        minWithdrawal
      });
    }

    // Subtract amount from driver's earnings immediately
    driver.earnings = (currentEarnings - amount).toFixed(2);
    await driver.save();

    // Create withdrawal request (without bank details in the withdrawal document)
    const withdrawal = new Withdrawal({
      driver: driverId,
      amount,
      status: 'pending'
    });

    await withdrawal.save();

    // Create negative transaction (completed since amount is already deducted)
    const transaction = new Transaction({
      driver: driverId,
      withdrawal: withdrawal._id,
      amount: -amount, // Negative amount for withdrawal
      type: 'debit',
      description: `Withdrawal request #${withdrawal._id} to ${driver.bankDetails.bankName}`,
      status: 'completed' // Mark as completed since amount is already deducted
    });

    await transaction.save();

    // Link transaction to withdrawal
    withdrawal.transaction = transaction._id;
    await withdrawal.save();

    res.status(201).json({
      message: 'Withdrawal request submitted successfully. Amount has been deducted from your earnings.',
      withdrawal: {
        _id: withdrawal._id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        createdAt: withdrawal.createdAt
      },
      transaction: {
        _id: transaction._id,
        amount: transaction.amount,
        status: transaction.status,
        description: transaction.description
      },
      newBalance: driver.earnings
    });

  } catch (error) {
    console.error('Withdrawal request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// Get driver's withdrawal history
exports.getWithdrawalHistory = async (req, res) => {
  try {
    const driverId = req.driver.id;
    const { page = 1, limit = 10, status } = req.query;

    const query = { driver: driverId };
    if (status) query.status = status;

    const withdrawals = await Withdrawal.find(query)
      .select('-accountNumber -iban') // Exclude sensitive data
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('transaction', 'amount status description date');

    const total = await Withdrawal.countDocuments(query);

    res.status(200).json({
      message: 'Withdrawal history fetched successfully',
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalWithdrawals: total,
      withdrawals
    });
  } catch (error) {
    console.error('Error fetching withdrawal history:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get withdrawal by ID
exports.getWithdrawalById = async (req, res) => {
  try {
    const { id } = req.params;
    const driverId = req.driver.id;

    const withdrawal = await Withdrawal.findOne({ _id: id, driver: driverId })
      .select('-accountNumber -iban') // Exclude sensitive data
      .populate('transaction', 'amount status description date');

    if (!withdrawal) {
      return res.status(404).json({ message: 'Withdrawal not found' });
    }

    res.status(200).json({
      message: 'Withdrawal fetched successfully',
      withdrawal
    });
  } catch (error) {
    console.error('Error fetching withdrawal:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin: Get all withdrawal requests
exports.getAllWithdrawals = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = {};
    if (status) query.status = status;

    const withdrawals = await Withdrawal.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('driver', 'name email phone')
      .populate('transaction', 'amount status description date');

    const total = await Withdrawal.countDocuments(query);

    res.status(200).json({
      message: 'Withdrawals fetched successfully',
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalWithdrawals: total,
      withdrawals
    });
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin: Get withdrawal details with sensitive information
exports.getWithdrawalDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const withdrawal = await Withdrawal.findById(id)
      .populate('driver', 'name email phone')
      .populate('transaction', 'amount status description date')
      .populate('processedBy', 'name email');

    if (!withdrawal) {
      return res.status(404).json({ message: 'Withdrawal not found' });
    }

    res.status(200).json({
      message: 'Withdrawal details fetched successfully',
      withdrawal
    });
  } catch (error) {
    console.error('Error fetching withdrawal details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin: Update withdrawal status
exports.updateWithdrawalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const adminId = req.user.id; // Assuming admin authentication

    const withdrawal = await Withdrawal.findById(id)
      .populate('driver')
      .populate('transaction');

    if (!withdrawal) {
      return res.status(404).json({ message: 'Withdrawal not found' });
    }

    // If approving a pending withdrawal
    if (withdrawal.status === 'pending' && status === 'approved') {
      // Check if driver still has sufficient earnings
      const driver = await Driver.findById(withdrawal.driver._id);
      const currentEarnings = parseFloat(driver.earnings || 0);
      
      if (currentEarnings < withdrawal.amount) {
        return res.status(400).json({ 
          message: 'Driver has insufficient earnings to complete this withdrawal',
          currentEarnings,
          withdrawalAmount: withdrawal.amount
        });
      }

      // Deduct from driver's earnings
      driver.earnings = (currentEarnings - withdrawal.amount).toFixed(2);
      await driver.save();

      // Update transaction status
      if (withdrawal.transaction) {
        withdrawal.transaction.status = 'completed';
        await withdrawal.transaction.save();
      }

      withdrawal.status = 'approved';
    } 
    // If rejecting a pending withdrawal
    else if (withdrawal.status === 'pending' && status === 'rejected') {
      withdrawal.status = 'rejected';
      
      // Update transaction status
      if (withdrawal.transaction) {
        withdrawal.transaction.status = 'failed';
        await withdrawal.transaction.save();
      }
    }
    // If marking as completed
    else if (withdrawal.status === 'approved' && status === 'completed') {
      withdrawal.status = 'completed';
      withdrawal.processedAt = new Date();
    } else {
      return res.status(400).json({ 
        message: 'Invalid status transition' 
      });
    }

    withdrawal.processedBy = adminId;
    if (notes) withdrawal.notes = notes;

    await withdrawal.save();

    res.status(200).json({
      message: `Withdrawal ${status} successfully`,
      withdrawal: {
        _id: withdrawal._id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        accountHolderName: withdrawal.accountHolderName,
        bankName: withdrawal.bankName,
        processedAt: withdrawal.processedAt
      }
    });
  } catch (error) {
    console.error('Error updating withdrawal status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get driver's available balance and withdrawal info
exports.getWithdrawalInfo = async (req, res) => {
  try {
    const driverId = req.driver.id;
    
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const currentEarnings = parseFloat(driver.earnings || 0);
    const minWithdrawal = 100;
    const availableForWithdrawal = currentEarnings >= minWithdrawal ? currentEarnings : 0;

    res.status(200).json({
      message: 'Withdrawal information fetched successfully',
      balanceInfo: {
        totalEarnings: currentEarnings,
        availableForWithdrawal: availableForWithdrawal,
        minWithdrawal: minWithdrawal,
        canWithdraw: availableForWithdrawal >= minWithdrawal
      }
    });
  } catch (error) {
    console.error('Error fetching withdrawal info:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};