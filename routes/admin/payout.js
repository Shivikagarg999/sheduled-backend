const express = require('express');
const router = express.Router();
const payoutController = require('../../controllers/admin/payout/payout');

router.post('/create', payoutController.createPayout);

router.get('/all', payoutController.getAllPayouts);

module.exports = router;
