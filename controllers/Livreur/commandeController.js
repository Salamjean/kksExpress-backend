const Commande = require("../../models/Commande");
const Livreur = require("../../models/Livreur");

// Fonction wrapper pour gérer les erreurs async
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ============================================
// ROUTES LIVREUR
// ============================================

// @desc    Accepter une commande
// @route   POST /api/livreur/commandes/:id/accepter
const accepterCommande = asyncHandler(async (req, res) => {
  console.log("\n✅ ACCEPTATION DE COMMANDE PAR LIVREUR");
  
  const { id } = req.params;
  const livreurId = req.livreur.id;
  
  try {
    // Trouver la commande
    const commande = await Commande.findByPk(id);
    
    if (!commande) {
      return res.status(404).json({
        success: false,
        message: "Commande non trouvée"
      });
    }
    
    // Vérifier si la commande est disponible
    if (commande.statut !== 'en_attente' || commande.livreur_id) {
      return res.status(400).json({
        success: false,
        message: "Cette commande n'est plus disponible"
      });
    }
    
    // Récupérer les infos du livreur
    const livreur = await Livreur.findByPk(livreurId);
    
    if (!livreur) {
      return res.status(404).json({
        success: false,
        message: "Livreur non trouvé"
      });
    }
    
    // Vérifier si le livreur a déjà accepté CETTE commande (au cas où)
    if (commande.livreur_id === livreurId) {
      return res.status(400).json({
        success: false,
        message: "Vous avez déjà accepté cette commande"
      });
    }
    
    // OPTIONNEL: Vérifier le nombre maximum de commandes simultanées
    // Par exemple, limiter à 3 commandes en même temps
    const commandesEnCours = await Commande.count({
      where: {
        livreur_id: livreurId,
        statut: ['en_cours', 'en_cours', 'en_route']
      }
    });
    
    const MAX_COMMANDES_SIMULTANEES = 5; // Définir une limite si nécessaire
    
    if (commandesEnCours >= MAX_COMMANDES_SIMULTANEES) {
      return res.status(400).json({
        success: false,
        message: `Vous avez déjà ${commandesEnCours} commandes en cours. Maximum: ${MAX_COMMANDES_SIMULTANEES}`
      });
    }
    
    // Mettre à jour la commande avec les infos du livreur
    const updates = {
      livreur_id: livreurId,
      livreur_nom: livreur.nom,
      livreur_prenom: livreur.prenom,
      livreur_telephone: livreur.telephone,
      livreur_email: livreur.email,
      livreur_latitude: livreur.latitude,
      livreur_longitude: livreur.longitude,
      statut: 'en_cours',
      date_acceptation: new Date()
    };
    
    await commande.update(updates);
    
    // NE PAS modifier le statut du livreur dans la table livreur
    // Le livreur reste disponible pour d'autres commandes
    
    return res.status(200).json({
      success: true,
      message: "Commande acceptée avec succès",
      commande: {
        id: commande.id,
        reference: commande.reference,
        statut: commande.statut,
        destinataire_adresse: commande.destinataire_adresse,
        expediteur_adresse: commande.expediteur_adresse,
        date_acceptation: commande.date_acceptation,
        // Informations supplémentaires utiles
        livreur_nom: `${livreur.prenom} ${livreur.nom}`,
        livreur_telephone: livreur.telephone
      }
    });
    
  } catch (error) {
    console.error("Erreur acceptation commande:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de l'acceptation de la commande"
    });
  }
});

// @desc    Récupérer les commandes disponibles pour livraison
// @route   GET /api/livreur/commandes/disponibles
const getCommandesDisponibles = asyncHandler(async (req, res) => {
  console.log("\n🚚 COMMANDES DISPONIBLES POUR LIVREUR");
  
  const livreurId = req.livreur.id;
  
  try {
    const commandes = await Commande.findAll({
      where: {
        statut: 'en_cours',
        livreur_id: livreurId || null
      },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    
    return res.status(200).json({
      success: true,
      count: commandes.length,
      commandes
    });
    
  } catch (error) {
    console.error("Erreur récupération commandes:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des commandes"
    });
  }
});

// @desc    Terminer la livraison
// @route   PUT /api/livreur/commandes/:id/terminer
const terminerLivraison = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const livreurId = req.livreur.id;
  
  try {
    const commande = await Commande.findOne({
      where: { id, livreur_id: livreurId }
    });
    
    if (!commande) {
      return res.status(404).json({
        success: false,
        message: "Commande non trouvée ou non assignée"
      });
    }
    
    // Vérifier si la commande peut être terminée
    if (commande.statut === 'livree') {
      return res.status(400).json({
        success: false,
        message: "Cette a déjà été livrée"
      });
    }

    // Vérifier si la commande peut être terminée
    if (commande.statut !== 'en_cours') {
      return res.status(400).json({
        success: false,
        message: "Cette commande ne peut pas être livrée"
      });
    }


    await commande.update({
      statut: 'livree',
      date_livraison: new Date()
    });
    
    return res.status(200).json({
      success: true,
      message: "Livraison effectuée avec succès",
      commande: {
        id: commande.id,
        reference: commande.reference,
        statut: commande.statut,
        date_livraison: commande.date_livraison
      }
    });
    
  } catch (error) {
    console.error("Erreur fin livraison:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la fin de la livraison"
    });
  }
});

// @desc    Mettre à jour la position du livreur
// @route   POST /api/livreur/commandes/position
const updatePosition = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;
  const livreurId = req.livreur.id;
  
  if (!latitude || !longitude) {
    return res.status(400).json({
      success: false,
      message: "Latitude et longitude sont requises"
    });
  }
  
  try {
    // Mettre à jour la position du livreur
    await Livreur.update(
      { latitude, longitude },
      { where: { id: livreurId } }
    );
    
    // Mettre à jour la position dans la commande en cours (si applicable)
    const commandeEnCours = await Commande.findOne({
      where: {
        livreur_id: livreurId,
        statut: ['en_attente', 'en_cours', 'livree']
      }
    });
    
    if (commandeEnCours) {
      await commandeEnCours.update({
        livreur_latitude: latitude,
        livreur_longitude: longitude
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Position mise à jour",
      latitude,
      longitude
    });
    
  } catch (error) {
    console.error("Erreur mise à jour position:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour de la position"
    });
  }
});

// @desc    Récupérer mes livraisons
// @route   GET /api/livreur/commandes/mes-livraisons
const getMesLivraisons = asyncHandler(async (req, res) => {
  const livreurId = req.livreur.id;
  
  try {
    const commandes = await Commande.findAll({
      where: {
        livreur_id: livreurId,
        statut: ['livree', 'annulee']
      },
      order: [['updatedAt', 'DESC']],
      limit: 100
    });
    
    return res.status(200).json({
      success: true,
      count: commandes.length,
      commandes
    });
    
  } catch (error) {
    console.error("Erreur récupération livraisons:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des livraisons"
    });
  }
});

// @desc    Récupérer les détails d'une commande spécifique
// @route   GET /api/livreur/commandes/:id
// @access  Private (Livreur)
const getCommandeDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const livreurId = req.livreur.id;
  
  try {
    const commande = await Commande.findOne({
      where: {
        id,
        livreur_id: livreurId
      }
    });
    
    if (!commande) {
      return res.status(404).json({
        success: false,
        message: "Commande non trouvée"
      });
    }
    
    return res.status(200).json({
      success: true,
      commande
    });
    
  } catch (error) {
    console.error("Erreur récupération détails commande:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des détails de la commande"
    });
  }
});

// Exportez TOUTES les fonctions
module.exports = {
  getCommandesDisponibles,
  accepterCommande,
  terminerLivraison,
  updatePosition,
  getMesLivraisons,
  getCommandeDetails,
};