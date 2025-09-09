// models/Driver.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const driverSchema = new mongoose.Schema({
  name: String,
  phone: { type: String, unique: true },
  email: String,
  password: String,

  // Orders
  orders: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order' 
  }],
  
  // Location (GeoJSON format)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    },
    updatedAt: { type: Date, default: Date.now }
  },
  
  // Current active order
  currentOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  
  // Boolean Values
  isAvailable: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Documents
  passport: String,
  governmentId: String,
  drivingLicense: String,
  Mulkiya: String,

  earnings: {
    type: Number,
    default: 0
  },

  avatar: {
    type: String,
    default: ""
  },
  
  bankDetails: {
    accountHolderName: String,
    accountNumber: String,
    iban: String,
    bankName: String,
    updatedAt: Date
  },
  
  // Socket ID for real-time communication
  socketId: String,
  
  // Vehicle information
  vehicle: {
    type: String,
    number: String,
    model: String,
    color: String
  }

}, { timestamps: true });

// Create geospatial index for location
driverSchema.index({ location: '2dsphere' });

driverSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

driverSchema.methods.matchPassword = function (password) {
  return bcrypt.compare(password, this.password);
};

// Update location method
driverSchema.methods.updateLocation = function(lng, lat) {
  this.location.coordinates = [lng, lat];
  this.location.updatedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Driver', driverSchema);