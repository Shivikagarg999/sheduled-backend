const express = require("express");
const router = express.Router();
const dashboardController = require("../../controllers/dashboard/dashboardController");

router.get("/overview", dashboardController.getDashboardOverview);
router.get("/orders-stats", dashboardController.getOrdersStats);
router.get("/drivers-performance", dashboardController.getDriverPerformance);
router.get("/transactions", dashboardController.getRecentTransactions);

module.exports = router;
