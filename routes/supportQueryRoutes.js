const express = require("express");
const router = express.Router();
const supportController = require("../controllers/support/supportController");

// POST /api/support → create query
router.post("/", supportController.createSupportQuery);

// GET /api/support → get all queries
router.get("/",supportController.getAllSupportQueries);

module.exports = router;
