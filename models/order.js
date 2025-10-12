
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  pickupBuilding: { type: String, required: true },
  pickupApartment: { type: String, required: true },
  pickupEmirate: { type: String, required: true },
  pickupArea: { type: String, required: true },

  dropBuilding: { type: String, required: true },
  dropApartment: { type: String, required: true },
  dropEmirate: { type: String, required: true },
  dropArea: { type: String, required: true },

  pickupContact: { type: String, required: true },
  dropContact: { type: String, required: true },

  deliveryType: {
    type: String,
    enum: ['delivery', 'standard', 'express', 'next-day', 'return'],
    required: true
  },
  returnType: {
    type: String,
    enum: ['no-return', 'with-return'],
    default: 'no-return'
  },

  paymentMethod: {
    type: String,
    enum: ['card', 'cash'],
    required: true
  },
  amount: { type: Number, required: true },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionId: { type: String },

  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'accepted', 'picked_up', 'in_transit', 'delivered']
  },
  trackingNumber: { type: String, unique: true },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  notes: String,

  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  },

  deliveryBoyLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    address: String,
    updatedAt: { type: Date, default: Date.now }
  },

  deliveryNotes: { type: String, default: '' },
  deliveryProofImage: { type: String, default: '' },

  eta: { type: String },

  driverDetails: {
    name: String,
    phone: String,
    vehicleNumber: String
  }

});

orderSchema.index({ deliveryBoyLocation: '2dsphere' });

orderSchema.pre('save', async function (next) {
  if (this.trackingNumber) return next();

  try {
    const lastOrder = await this.constructor.findOne({ trackingNumber: { $regex: /^AE\d{3,}$/ } })
      .sort({ trackingNumber: -1 })
      .lean();

    let lastNumber = 0;

    if (lastOrder && lastOrder.trackingNumber) {
      lastNumber = parseInt(lastOrder.trackingNumber.slice(2)) || 0;
    }

    const newNumber = lastNumber + 1;
    this.trackingNumber = `AE${newNumber.toString().padStart(3, '0')}`;

    next();
  } catch (err) {
    next(err);
  }
});

orderSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;