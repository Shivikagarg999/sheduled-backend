const Admin = require('../../models/admin');
const generateToken = require('../../utils/generateToken');

// ✅ Admin Login
exports.loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // ✅ Return full payload to be stored on frontend
    const token = generateToken(admin._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        token,
      },
    });

  } catch (err) {
    console.error('Admin Login Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      error: err.message,
    });
  }
};
