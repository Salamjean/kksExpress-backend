// routes/livreur.js
const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/authMiddleware'); 
const {
  registerLivreur,
  setPassword, 
  getAllLivreurs,
  getLivreurById,
  updateLivreur,
  deleteLivreur,
  updateLivreurPosition,
  getLivreurStats
} = require('../../controllers/livreurController');

// Routes publiques
router.post('/register', registerLivreur);
router.post('/set-password', setPassword); 

// Routes protégées 
router.get('/', getAllLivreurs);
router.get('/:id', getLivreurById);
router.put('/:id', updateLivreur);
router.get('/stats', getLivreurStats);
router.delete('/:id', deleteLivreur);
router.put('/:id/position', protect, updateLivreurPosition);

module.exports = router;