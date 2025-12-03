const express = require("express");
const router = express.Router();
const { protectLivreur } = require("../../middleware/livreurMiddleware"); // Votre middleware

// IMPORTATION CORRECTE - Vérifiez le chemin
const {
  getCommandesDisponibles,
  accepterCommande,
  getMesLivraisons,
  terminerLivraison,
  updatePosition,
  getCommandeDetails,
  getHistoriqueLivraisons
} = require("../../controllers/livreur/commandeController");

// Routes protégées
router.get("/disponibles", protectLivreur, getCommandesDisponibles);
router.get("/mes-livraisons", protectLivreur, getMesLivraisons);
router.get("/historique", protectLivreur, getHistoriqueLivraisons);
router.get("/:id", protectLivreur, getCommandeDetails);
router.post("/:id/accepter", protectLivreur, accepterCommande);
router.put("/:id/terminer", protectLivreur, terminerLivraison);
router.post("/position", protectLivreur, updatePosition);

module.exports = router;
