const mongoose = require("mongoose");

const supportQuerySchema = new mongoose.Schema({
  email: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SupportQuery", supportQuerySchema);