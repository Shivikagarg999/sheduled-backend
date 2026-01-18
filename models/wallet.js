const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const walletSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  balance: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'AED'
  },
  transactions: [{
    amount: Number,
    type: {
      type: String,
      enum: ['credit', 'debit']
    },
    description: String,
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

const Wallet = mongoose.model('Wallet', walletSchema);