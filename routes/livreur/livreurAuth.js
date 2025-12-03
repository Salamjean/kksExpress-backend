const express = require('express');
const router = express.Router();
const {
  loginLivreur,
  logoutLivreur,
  getMyProfile,
  updateMyProfile,
  changePassword
} = require('../../controllers/livreur/livreurAuthController');

const { protectLivreur } = require('../../middleware/livreurMiddleware');

// Routes publiques
router.post('/login', loginLivreur);

// Routes protégées
router.use(protectLivreur);
router.post('/logout', logoutLivreur);
router.get('/profile', getMyProfile);
router.put('/profile', updateMyProfile);
router.put('/change-password', changePassword);

module.exports = router;