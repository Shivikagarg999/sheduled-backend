const mongoose = require('mongoose');
const Withdrawal = require('./withdraw'); 

const payoutSchema = new mongoose.Schema({
  withdrawal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Withdrawal',
    required: true,
    unique: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'upi', 'manual', 'wallet', 'other'],
    required: true
  },
  referenceId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['initiated', 'successful', 'failed'],
    default: 'initiated'
  },
  notes: String,
  processedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });


payoutSchema.post('save', async function (doc) {
  try {
    const withdrawal = await Withdrawal.findById(doc.withdrawal);
    if (!withdrawal) return;

    if (doc.status === 'successful') {
      withdrawal.status = 'completed';
      withdrawal.processedAt = new Date();
    } else if (doc.status === 'failed') {
      withdrawal.status = 'rejected';
    } else if (doc.status === 'initiated') {
      if (withdrawal.status === 'pending') withdrawal.status = 'approved';
    }

    withdrawal.payout = doc._id;
    await withdrawal.save();
  } catch (err) {
    console.error('Error syncing withdrawal with payout:', err.message);
  }
});

module.exports = mongoose.model('Payout', payoutSchema);
