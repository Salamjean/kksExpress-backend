// routes/auth.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { registerAdmin, loginAdmin, getCurrentAdmin } = require('../controllers/authController');

// Routes publiques
router.post('/register', registerAdmin);
router.post('/login', loginAdmin);

// Routes protégées
router.get('/me', protect, getCurrentAdmin);

module.exports = router;