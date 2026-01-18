const express = require('express');
const router = express.Router();
const { loginAdmin } = require('../../controllers/admin/auth');
const Admin = require('../../models/admin')

router.post('/login', loginAdmin);
// One-time only:
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const admin = await Admin.create({ name, email, password });
  res.json(admin);
});


module.exports = router;