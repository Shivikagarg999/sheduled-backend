const Driver = require('../../../models/driver');
const Order = require('../../../models/order');
const imagekit = require('../../../utils/imagekit');

// ✅ Admin Signup Driver (Auto-Verified)
const registerDriver = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const files = req.files;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!files || !files.passport || !files.governmentId || !files.drivingLicense || !files.Mulkiya) {
      return res.status(400).json({ message: 'All documents are required' });
    }

    const existingDriver = await Driver.findOne({ $or: [{ phone }, { email }] });
    if (existingDriver) {
      return res.status(400).json({ message: 'Driver with this phone or email already exists' });
    }

    // Helper function for uploading files
    const uploadFile = async (file, folderName) => {
      const uploadResponse = await imagekit.upload({
        file: file.buffer.toString('base64'),
        fileName: `${folderName}_${Date.now()}_${file.originalname}`,
        folder: '/drivers'
      });
      return uploadResponse.url;
    };

    // Upload all documents
    const passportUrl = await uploadFile(files.passport[0], 'passport');
    const govtIdUrl = await uploadFile(files.governmentId[0], 'governmentId');
    const licenseUrl = await uploadFile(files.drivingLicense[0], 'drivingLicense');
    const mulkiyaUrl = await uploadFile(files.Mulkiya[0], 'mulkiya');

    // Create driver (auto-verified ✅)
    const driver = new Driver({
      name,
      email,
      phone,
      password,
      passport: passportUrl,
      governmentId: govtIdUrl,
      drivingLicense: licenseUrl,
      Mulkiya: mulkiyaUrl,
      isVerified: true // auto verified since admin creates it
    });

    await driver.save();

    const token = generateToken(driver._id);

    res.status(201).json({
      message: 'Driver registered successfully',
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        isVerified: driver.isVerified,
        passport: driver.passport,
        governmentId: driver.governmentId,
        drivingLicense: driver.drivingLicense,
        Mulkiya: driver.Mulkiya
      },
      token
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Mark as verified 
const markDriverAsVerified = async (req, res) => {
  try {
    const { driverId } = req.params;

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    driver.isVerified = true;
    await driver.save();

    res.status(200).json({
      message: 'Driver marked as verified successfully',
      driver,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// 🟡 Read all drivers
const getAllDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find().select('-password');
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// 🔵 Update driver
const updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const driver = await Driver.findByIdAndUpdate(id, updates, { new: true });
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    res.json({ message: 'Driver updated', driver });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Get Driver by ID
const getDriverById = async (req, res) => {
  try {
    const { driverId } = req.params;

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.status(200).json(driver);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// 🔴 Delete driver
const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;

    const driver = await Driver.findByIdAndDelete(id);
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    res.json({ message: 'Driver deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const assignDriverToOrder = async (req, res) => {
  try {
    const { orderId, driverId } = req.body;

    // 1. Update the order with driver
    const order = await Order.findByIdAndUpdate(orderId, { driver: driverId }, { new: true });

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // 2. Update the driver by adding order to their list
    await Driver.findByIdAndUpdate(driverId, { $addToSet: { orders: order._id } });

    res.status(200).json({ success: true, message: 'Driver assigned', data: order });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get driver's wallet information
const getWallet = async (req, res) => {
  try {
    const driverId = req.driver.id;
    
    const wallet = await Wallet.findOne({ driver: driverId })
      .populate('transactions.order');
    
    if (!wallet) {
      // Create wallet if it doesn't exist
      const newWallet = new Wallet({ driver: driverId });
      await newWallet.save();
      return res.json(newWallet);
    }
    
    res.json(wallet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerDriver,
  getAllDrivers,
  updateDriver,
  getDriverById,
  deleteDriver,
  assignDriverToOrder,
  markDriverAsVerified,
  getWallet
};
