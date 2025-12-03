// routes/commande.js
const express = require('express');
const router = express.Router();
const {
  createCommande,
  getMesCommandes,
  getCommandeById,
  updateCommande,
  annulerCommande,
  suivreCommande,
  getCommandesAnnulees,
} = require('../controllers/commande/commandeController');

const { protectUser } = require('../middleware/userMiddleware');

// ============================================
// ROUTES PUBLIQUES
// ============================================
router.get('/suivre/:reference', suivreCommande);

// ============================================
// ROUTES PROTÉGÉES (UTILISATEUR)
// ============================================
router.use(protectUser);

router.post('/', createCommande);
router.get('/mes-annulees', getCommandesAnnulees);
router.get('/mes-commandes', getMesCommandes);
router.get('/:id', getCommandeById);
router.put('/:id', updateCommande);
router.put('/:id/annuler', annulerCommande);

module.exports = router;