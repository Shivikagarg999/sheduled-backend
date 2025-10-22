const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  processedAt: Date,
  notes: String,
  payout: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Payout'
}

}, { timestamps: true });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);