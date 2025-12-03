// routes/adminPaiementRoutes.js
const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/adminMiddleware');
const {
  getAllPaiements,
  getPaiementsByLivreur,
  getSoldesLivreurs,
  createPaiement,
  updatePaiement,
  deletePaiement,
  recalculerStatuts,
  getPaiementStats
} = require('../controllers/adminPaiementController');

// Toutes les routes sont protégées pour admin
router.use(protectAdmin);

// Routes principales
router.get('/', getAllPaiements);
router.get('/stats', getPaiementStats);
router.get('/soldes', getSoldesLivreurs);
router.post('/', createPaiement);

// Routes spécifiques à un livreur
router.get('/livreur/:livreurId', getPaiementsByLivreur);
router.post('/:livreurId/recalculer', recalculerStatuts);

// Routes CRUD sur un paiement spécifique
router.put('/:id', updatePaiement);
router.delete('/:id', deletePaiement);

module.exports = router;