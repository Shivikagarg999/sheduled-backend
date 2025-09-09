const SupportQuery = require("../../models/supportQuery");

exports.createSupportQuery = async (req, res) => {
  const { email, message } = req.body;

  if (!email || !message) {
    return res.status(400).json({ error: "Email and message are required" });
  }

  try {
    const newQuery = new SupportQuery({ email, message });
    await newQuery.save();

    res.status(200).json({ success: true, message: "Support query saved!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to save support query" });
  }
};

// Get all support queries
exports.getAllSupportQueries = async (req, res) => {
  try {
    const queries = await SupportQuery.find().sort({ createdAt: -1 });
    res.status(200).json(queries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch queries" });
  }
};
