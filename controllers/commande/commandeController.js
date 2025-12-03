// controllers/commande/commandeController.js
const Commande = require("../../models/Commande");
const User = require("../../models/User");

// Fonction wrapper pour gérer les erreurs async
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ============================================
// ROUTES UTILISATEUR
// ============================================

// @desc    Créer une nouvelle commande
// @route   POST /api/commandes
const createCommande = asyncHandler(async (req, res) => {
  console.log("\n📦 CRÉATION DE COMMANDE");
  
  const userId = req.user.id;
  const user = await User.findByPk(userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Utilisateur non trouvé"
    });
  }
  
  // Données de la commande
  const {
    destinataire_latitude,
    destinataire_longitude,
    destinataire_adresse,
    expediteur_contact_alt,
    expediteur_latitude,
    expediteur_longitude,
    expediteur_adresse,
    type_colis,
    libelle_colis,
    nature_colis,
    description_colis,
    tarif,
  } = req.body;
  
  // Validation
  if (!destinataire_latitude || !destinataire_longitude || !destinataire_adresse) {
    return res.status(400).json({
      success: false,
      message: "Les coordonnées et adresse du destinataire sont obligatoires"
    });
  }
  
  try {
    // GÉNÉRER UNE RÉFÉRENCE UNIQUE
    const generateReference = () => {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const random = Math.floor(1000 + Math.random() * 9000); // 4 chiffres
      return `CMD${year}${month}${day}${random}`;
    };
    
    // Remplir automatiquement les infos utilisateur
    const commandeData = {
      user_id: userId,
      user_nom: user.nom,
      user_prenom: user.prenom,
      user_telephone: user.telephone,
      user_email: user.email,
      
      // Générer la référence
      reference: generateReference(),
      
      // Destinataire
      destinataire_latitude,
      destinataire_longitude,
      destinataire_adresse,
      
      // Expéditeur
      expediteur_contact_alt: expediteur_contact_alt || null,
      expediteur_latitude: expediteur_latitude || user.latitude,
      expediteur_longitude: expediteur_longitude || user.longitude,
      expediteur_adresse: expediteur_adresse || user.adresse,
      
      // Colis
      type_colis: type_colis || "Appareils",
      libelle_colis: libelle_colis || null,
      nature_colis: nature_colis || "standard",
      description_colis: description_colis || null,
      
      // Tarif
      tarif: tarif || 0,
      
      // Statut par défaut
      statut: "en_attente"
    };
    
    // Créer la commande
    const commande = await Commande.create(commandeData);
    
    return res.status(201).json({
      success: true,
      message: "Commande créée avec succès",
      commande
    });
    
  } catch (error) {
    console.error("Erreur création commande:", error.message);
    
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Données invalides"
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la création de la commande"
    });
  }
});

// @desc    Récupérer toutes mes commandes
// @route   GET /api/commandes/mes-commandes
const getMesCommandes = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const commandes = await Commande.findAll({
    where: { user_id: userId },
    order: [['createdAt', 'DESC']]
  });
  
  return res.status(200).json({
    success: true,
    count: commandes.length,
    commandes
  });
});

// @desc    Récupérer une commande spécifique
// @route   GET /api/commandes/:id
const getCommandeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const commande = await Commande.findOne({
    where: { id, user_id: userId }
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
});

// @desc    Mettre à jour une commande
// @route   PUT /api/commandes/:id
const updateCommande = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  // Trouver la commande
  const commande = await Commande.findOne({
    where: { id, user_id: userId }
  });
  
  if (!commande) {
    return res.status(404).json({
      success: false,
      message: "Commande non trouvée"
    });
  }
  
  // Vérifier si la commande peut être modifiée
  if (commande.statut !== 'en_attente') {
    return res.status(400).json({
      success: false,
      message: "Cette commande ne peut plus être modifiée"
    });
  }
  
  // Mettre à jour
  await commande.update(req.body);
  
  return res.status(200).json({
    success: true,
    message: "Commande mise à jour",
    commande
  });
});

// @desc    Annuler une commande
// @route   PUT /api/commandes/:id/annuler
const annulerCommande = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const commande = await Commande.findOne({
    where: { id, user_id: userId }
  });
  
  if (!commande) {
    return res.status(404).json({
      success: false,
      message: "Commande non trouvée"
    });
  }
  
  // Vérifier si la commande peut être annulée
  if (commande.statut !== 'en_attente') {
    return res.status(400).json({
      success: false,
      message: "Cette commande ne peut plus être annulée"
    });
  }
  
  // Annuler
  await commande.update({ statut: 'annulee' });
  
  return res.status(200).json({
    success: true,
    message: "Commande annulée avec succès"
  });
});

// @desc    Récupérer les commandes annulées
// @route   GET /api/commandes/annulees
const getCommandesAnnulees = asyncHandler(async (req, res) => {
  console.log("\n🗑️  COMMANDES ANNULÉES");
  
  const userId = req.user.id;
  
  try {
    const commandes = await Commande.findAll({
      where: { 
        user_id: userId,
        statut: 'annulee'
      },
      order: [['updatedAt', 'DESC']], // Tri par date d'annulation
      attributes: [
        'id',
        'reference',
        'statut',
        'type_colis',
        'nature_colis',
        'destinataire_adresse',
        'tarif',
        'createdAt',
        'updatedAt'
      ]
    });
    
    return res.status(200).json({
      success: true,
      count: commandes.length,
      message: `Vous avez ${commandes.length} commande(s) annulée(s)`,
      commandes
    });
    
  } catch (error) {
    console.error("Erreur récupération commandes annulées:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des commandes annulées"
    });
  }
});

// @desc    Suivre une commande (publique)
// @route   GET /api/commandes/suivre/:reference
const suivreCommande = asyncHandler(async (req, res) => {
  const { reference } = req.params;
  
  const commande = await Commande.findOne({
    where: { reference }
  });
  
  if (!commande) {
    return res.status(404).json({
      success: false,
      message: "Commande non trouvée"
    });
  }
  
  return res.status(200).json({
    success: true,
    commande: {
      reference: commande.reference,
      statut: commande.statut,
      createdAt: commande.createdAt,
      destinataire_adresse: commande.destinataire_adresse,
      type_colis: commande.type_colis,
      nature_colis: commande.nature_colis,
      livreur_nom: commande.livreur_nom,
      livreur_telephone: commande.livreur_telephone
    }
  });
});

module.exports = {
  createCommande,
  getMesCommandes,
  getCommandeById,
  updateCommande,
  annulerCommande,
  suivreCommande,
  getCommandesAnnulees,
};