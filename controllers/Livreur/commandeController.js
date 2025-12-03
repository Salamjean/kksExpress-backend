const Commande = require("../../models/Commande");
const Livreur = require("../../models/Livreur");
const { sendOrderStatusEmail } = require("../../utils/emailService");

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

    // Vérifier le nombre maximum de commandes simultanées
    const commandesEnCours = await Commande.count({
      where: {
        livreur_id: livreurId,
        statut: 'en_cours'
      }
    });

    const MAX_COMMANDES_SIMULTANEES = 5;

    if (commandesEnCours >= MAX_COMMANDES_SIMULTANEES) {
      return res.status(400).json({
        success: false,
        message: `Vous avez déjà ${commandesEnCours} commandes en cours. Maximum: ${MAX_COMMANDES_SIMULTANEES}`
      });
    }

    // Mettre à jour la commande avec les infos du livreur
    await commande.update({
      livreur_id: livreurId,
      livreur_nom: livreur.nom,
      livreur_prenom: livreur.prenom,
      livreur_telephone: livreur.telephone,
      livreur_email: livreur.email,
      livreur_latitude: livreur.latitude,
      livreur_longitude: livreur.longitude,
      statut: 'en_cours',
      date_acceptation: new Date()
    });

    console.log(`✅ Commande ${commande.reference} acceptée par ${livreur.prenom} ${livreur.nom}`);

    // Envoyer notification email au client
    if (commande.user_email) {
      await sendOrderStatusEmail(
        commande.user_email,
        commande.user_nom,
        commande.user_prenom,
        commande
      );
    }

    return res.status(200).json({
      success: true,
      message: "Commande acceptée avec succès",
      commande: {
        id: commande.id,
        reference: commande.reference,
        statut: commande.statut,
        destinataire_adresse: commande.destinataire_adresse,
        expediteur_adresse: commande.expediteur_adresse,
        date_acceptation: commande.date_acceptation
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

  try {
    // Commandes en attente = non encore acceptées par un livreur
    const commandes = await Commande.findAll({
      where: {
        statut: 'en_attente',
        livreur_id: null
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

// @desc    Récupérer MES commandes en cours de livraison
// @route   GET /api/livreur/commandes/mes-livraisons
const getMesLivraisons = asyncHandler(async (req, res) => {
  const livreurId = req.livreur.id;

  try {
    const commandes = await Commande.findAll({
      where: {
        livreur_id: livreurId,
        statut: 'en_cours'
      },
      order: [['date_acceptation', 'DESC']],
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
        message: "Cette commande a déjà été livrée"
      });
    }

    if (commande.statut !== 'en_cours') {
      return res.status(400).json({
        success: false,
        message: "Cette commande ne peut pas être livrée"
      });
    }

    // VÉRIFICATION DU CODE DE CONFIRMATION
    const { code_confirmation } = req.body;

    if (!code_confirmation) {
      return res.status(400).json({
        success: false,
        message: "Le code de confirmation est requis"
      });
    }

    if (commande.code_confirmation && commande.code_confirmation !== code_confirmation) {
      return res.status(400).json({
        success: false,
        message: "Code de confirmation incorrect"
      });
    }

    await commande.update({
      statut: 'livree',
      date_livraison: new Date()
    });

    console.log(`✅ Livraison terminée: ${commande.reference}`);

    // Envoyer notification email au client
    if (commande.user_email) {
      await sendOrderStatusEmail(
        commande.user_email,
        commande.user_nom,
        commande.user_prenom,
        commande
      );
    }

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
    // Mettre à jour la position du livreur dans sa table
    await Livreur.update(
      { latitude, longitude },
      { where: { id: livreurId } }
    );

    // Mettre à jour la position dans TOUTES les commandes en cours de ce livreur
    await Commande.update(
      {
        livreur_latitude: latitude,
        livreur_longitude: longitude
      },
      {
        where: {
          livreur_id: livreurId,
          statut: 'en_cours'
        }
      }
    );

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

// @desc    Récupérer les détails d'une commande spécifique
// @route   GET /api/livreur/commandes/:id
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

// @desc    Récupérer l'historique de mes livraisons terminées
// @route   GET /api/livreur/commandes/historique
const getHistoriqueLivraisons = asyncHandler(async (req, res) => {
  const livreurId = req.livreur.id;

  try {
    const commandes = await Commande.findAll({
      where: {
        livreur_id: livreurId,
        statut: 'livree'
      },
      order: [['date_livraison', 'DESC']],
      limit: 100
    });

    // Calculer les statistiques
    const stats = {
      total_livraisons: commandes.length,
      revenus_total: commandes.reduce((sum, cmd) => sum + parseFloat(cmd.tarif || 0), 0)
    };

    return res.status(200).json({
      success: true,
      stats,
      count: commandes.length,
      commandes
    });

  } catch (error) {
    console.error("Erreur récupération historique:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de l'historique"
    });
  }
});

module.exports = {
  getCommandesDisponibles,
  accepterCommande,
  terminerLivraison,
  updatePosition,
  getMesLivraisons,
  getCommandeDetails,
  getHistoriqueLivraisons
};