const express = require('express');
const router = express.Router();
const {
  registerDriver,
  getAllDrivers,
  updateDriver,
  deleteDriver,
  assignDriverToOrder,
  markDriverAsVerified,
  getDriverById
} = require('../../controllers/admin/driver/driver');

// 🚚 DRIVER CRUD
router.post('/create-driver', registerDriver);
router.get('/all', getAllDrivers);
router.get('/driver/:driverId', getDriverById);
router.put('/verify-driver/:driverId', markDriverAsVerified);
router.put('/update-driver/:id', updateDriver);
router.delete('/delete-driver/:id', deleteDriver);

// 📦 ASSIGN DRIVER TO ORDER
router.post('/assign-driver', assignDriverToOrder);

module.exports = router;