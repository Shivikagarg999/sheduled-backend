const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
  },
  
  description: {
    type: String,
    required: [true, 'Project description is required'],
    trim: true,
    minlength: [10, 'Project description must be at least 10 characters'],
    maxlength: [5000, 'Project description cannot exceed 5000 characters']
  },
  
  timeline: {
    type: String,
    enum: [
      'immediate',
      '1-2 weeks',
      '2-4 weeks',
      '1-3 months',
      '3-6 months',
      '6 months plus',
      'flexible'
    ],
    default: 'flexible'
  },
  
  budget: {
    type: String,
    enum: [
      'under $500',
      '$500 - $1000',
      '$1000 - $5000',
      '$5000 - $10000',
      '$10000 - $25000',
      '$25000 - $50000',
      '$50000+',
      'To be discussed'
    ],
    default: 'To be discussed'
  },
  
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'contacted', 'accepted', 'rejected'],
    default: 'pending'
  },
  
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Proposal', proposalSchema);