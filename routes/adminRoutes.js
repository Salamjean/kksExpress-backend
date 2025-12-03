// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/adminMiddleware');
const adminController = require('../controllers/adminController');

// Toutes les routes sont protégées pour admin uniquement
router.use(protectAdmin);

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// Commandes
router.get('/commandes', adminController.getAllCommandes);
router.get('/commandes/recentes', adminController.getRecentCommandes);
router.get('/commandes/aujourdhui', adminController.getTodayCommandes);

// Livreurs
router.get('/livreurs', adminController.getAllLivreurs);
router.get('/livreurs/actifs', adminController.getActiveLivreurs);

module.exports = router;