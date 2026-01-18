const Driver = require("../../models/driver");
const bcrypt = require("bcryptjs");
const Order= require('../../models/order')
const imagekit = require('../../utils/imagekit');
const jwt = require('jsonwebtoken');
const upload= require('../../middleware/upload');

const generateToken = (driverId) => {
  return jwt.sign({ id: driverId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

exports.signupDriver = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const files = req.files;
    if (!files || !files.passport || !files.governmentId || !files.drivingLicense || !files.Mulkiya) {
      return res.status(400).json({ message: 'All documents are required' });
    }

    const existingDriver = await Driver.findOne({ $or: [{ phone }, { email }] });
    if (existingDriver) return res.status(400).json({ message: 'Driver with this phone or email already exists' });

    const uploadFile = async (file, folderName) => {
      const uploadResponse = await imagekit.upload({
        file: file.buffer.toString('base64'),
        fileName: `${folderName}_${Date.now()}_${file.originalname}`,
        folder: '/drivers'
      });
      return uploadResponse.url;
    };

    const passportUrl = await uploadFile(files.passport[0], 'passport');
    const govtIdUrl = await uploadFile(files.governmentId[0], 'governmentId');
    const licenseUrl = await uploadFile(files.drivingLicense[0], 'drivingLicense');
    const mulkiyaUrl = await uploadFile(files.Mulkiya[0], 'mulkiya');

    // Create driver
    const driver = new Driver({
      name,
      email,
      phone,
      password,
      passport: passportUrl,
      governmentId: govtIdUrl,
      drivingLicense: licenseUrl,
      Mulkiya: mulkiyaUrl
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
        isVerified: driver.isVerified
      },
      token
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
exports.driverLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const driver = await Driver.findOne({ email });
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Check if driver is verified
    if (!driver.isVerified) {
      return res.status(403).json({ message: "Your account is not verified. Please contact support." });
    }

    const isMatch = await bcrypt.compare(password, driver.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: driver._id, role: "driver" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};
exports.getDriverProfile = async (req, res) => {
  try {
    const driver = await Driver.findById(req.driver.id).select("-password");
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    res.status(200).json(driver);
  } catch (err) {
    console.error("Error fetching driver profile:", err);
    res.status(500).json({ message: "Server error" });
  }
};
exports.editDriverProfile = async (req, res) => {
  try {
    const { name, email, phone, vehicleNumber } = req.body;
    const driver = await Driver.findById(req.driver.id);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Upload profile image if provided
    if (req.file) {
      const uploadedImage = await imagekit.upload({
        file: req.file.buffer, // buffer from multer
        fileName: `driver_${driver._id}.jpg`
      });
      driver.avatar = uploadedImage.url;
    }

    if (name) driver.name = name;
    if (email) driver.email = email;
    if (phone) driver.phone = phone;
    if (vehicleNumber) driver.vehicleNumber = vehicleNumber;

    await driver.save();

    res.status(200).json({
      message: "Profile updated successfully",
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        vehicleNumber: driver.vehicleNumber,
        avatar: driver.avatar
      }
    });
  } catch (err) {
    console.error("Error updating driver profile:", err);
    res.status(500).json({ message: "Server error" });
  }
};
exports.getMyOrders = async (req, res) => {
  try {
    const driverId = req.driver.id;

    const orders = await Order.find({ driver: driverId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
exports.toggleAvailability = async (req, res) => {
  try {
    const driver = await Driver.findById(req.driver.id);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Toggle availability
    driver.isAvailable = !driver.isAvailable;
    await driver.save();

    res.status(200).json({
      message: `Availability updated to ${driver.isAvailable}`,
      isAvailable: driver.isAvailable
    });
  } catch (err) {
    console.error("Error toggling availability:", err);
    res.status(500).json({ message: "Server error" });
  }
};
exports.getTotalEarnings = async (req, res) => {
  try {
    const driverId = req.driver.id;
    const driver = await Driver.findById(driverId).select('earnings name email');
    
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.status(200).json({
      message: 'Total earnings fetched successfully',
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        totalEarnings: driver.earnings
      }
    });
  } catch (error) {
    console.error('Error fetching total earnings:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
