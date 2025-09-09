const User = require('../../../models/user');

// 🔹 Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, message: 'Users fetched successfully', data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, message: 'User fetched successfully', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch user', error: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) return res.status(400).json({ success: false, message: 'Email or phone already in use' });

    const newUser = new User({ name, email, phone, password });
    await newUser.save();

    res.status(201).json({ success: true, message: 'User created successfully', data: newUser });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create user', error: error.message });
  }
};

// 🔹 Update user
exports.updateUser = async (req, res) => {
  try {
    const { name, email, phone, addresses } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, addresses, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, message: 'User updated successfully', data: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update user', error: error.message });
  }
};

// 🔹 Delete user
exports.deleteUser = async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete user', error: error.message });
  }
};
