const express = require('express');
const router = express.Router();
const { protectLivreur } = require('../middleware/livreurMiddleware');

const {
  initierPaiementMobile,
  verifierEtValiderPaiement,
  getPaiementsMobileEnAttente,
  annulerPaiementMobile
} = require('../controllers/paiementMobileController');

// Routes pour paiements mobiles
router.post('/initier', protectLivreur, initierPaiementMobile);
router.post('/verifier', protectLivreur, verifierEtValiderPaiement);
router.get('/en-attente', protectLivreur, getPaiementsMobileEnAttente);
router.post('/annuler', protectLivreur, annulerPaiementMobile);

module.exports = router;