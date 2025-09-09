const express = require('express');
const router = express.Router();
const { driverLogin, getDriverProfile,getTotalEarnings, editDriverProfile ,getMyOrders , signupDriver, toggleAvailability} = require('../controllers/driver/auth');
const verifyDriverToken = require('../middleware/driverAuth');
const upload = require('../middleware/upload');
const driverController = require('../controllers/driver/orders');

//auth
router.post('/signup', upload.fields([
  { name: 'passport', maxCount: 1 },
  { name: 'governmentId', maxCount: 1 },
  { name: 'drivingLicense', maxCount: 1 },
  { name: 'Mulkiya', maxCount: 1 }
]), signupDriver);
router.post('/login', driverLogin);
//profile
router.get('/profile',verifyDriverToken,getDriverProfile );
router.put('/profile', verifyDriverToken, upload.single('avatar'), editDriverProfile);
//orders
router.get('/orders', verifyDriverToken, getMyOrders);
router.get('/orders/available',verifyDriverToken, driverController.getAvailableOrders);
router.post('/orders/accept',verifyDriverToken, driverController.acceptOrder);
router.get('/orders/ongoing', verifyDriverToken, driverController.getOngoingOrders);
router.post('/orders/deliver',verifyDriverToken, driverController.markAsDelivered);
router.get('/orders/current', driverController.getCurrentOrders);
// earnings and transactions
router.get('/earnings', verifyDriverToken, getTotalEarnings);
router.get('/transactions', verifyDriverToken, driverController.getTransactionHistory);
//others
router.patch('/toggle-availability', verifyDriverToken, toggleAvailability);

module.exports = router;