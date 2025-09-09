const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
  },
  date: {
    type: Date,
    default: Date.now
  }
});

// Middleware to set status based on amount
transactionSchema.pre('save', function (next) {
  if (this.amount < 0) {
    this.status = 'pending'; // Negative → pending
  } else {
    this.status = 'completed'; // Positive → completed
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);
