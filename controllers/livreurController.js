const Livreur = require("../models/Livreur");
const bcrypt = require("bcryptjs");
const {
  sendActivationEmail,
  generateResetToken,
} = require("../utils/emailService");
const { Op } = require("sequelize");

/**
 * Inscription d'un nouveau livreur
 */
const registerLivreur = async (req, res) => {
  try {
    const {
      nom,
      prenom,
      email,
      telephone,
      telephone_urgence,
      adresse,
      date_naissance,
      numero_permis,
      type_vehicule,
      plaque_immatriculation,
    } = req.body;

    // Validation des champs requis
    if (!nom || !prenom || !email || !telephone || !telephone_urgence) {
      return res.status(400).json({
        success: false,
        message: "Tous les champs obligatoires doivent être remplis",
      });
    }

    // Vérifier si l'email existe déjà
    const existingLivreur = await Livreur.findOne({ where: { email } });
    if (existingLivreur) {
      return res.status(400).json({
        success: false,
        message: "Un livreur avec cet email existe déjà",
      });
    }

    // Générer un token de réinitialisation
    const resetToken = generateResetToken();

    // Pour l'instant, on crée un mot de passe temporaire
    const tempPassword = "temp_" + Date.now();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Créer le nouveau livreur avec un statut "en_attente"
    const livreur = await Livreur.create({
      nom,
      prenom,
      email,
      telephone,
      telephone_urgence,
      password: hashedPassword,
      adresse: adresse || null,
      date_naissance: date_naissance || null,
      numero_permis: numero_permis || null,
      type_vehicule: 'moto' || null,
      plaque_immatriculation: plaque_immatriculation || null,
      statut: "actif",
      date_embauche: new Date(),
      reset_token: resetToken,
      reset_token_expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Envoyer l'email d'activation
    let emailSent = false;
    let emailError = null;

    try {
      await sendActivationEmail(email, nom, prenom, resetToken);
      emailSent = true;
      console.log("✅ Email d'activation envoyé avec succès");
    } catch (error) {
      console.error("❌ Échec envoi email d'activation:", error.message);
      emailError = error.message;
    }

    res.status(201).json({
      success: true,
      message: emailSent
        ? "Livreur créé avec succès. Un email d'activation a été envoyé."
        : "Livreur créé avec succès (échec envoi email)",
      livreur: {
        id: livreur.id,
        nom: livreur.nom,
        prenom: livreur.prenom,
        email: livreur.email,
        telephone: livreur.telephone,
        telephone_urgence: livreur.telephone_urgence,
        statut: livreur.statut,
        date_embauche: livreur.date_embauche,
        type_vehicule: 'moto',
        createdAt: livreur.createdAt,
      },
      emailSent: emailSent,
      emailError: emailError,
    });
  } catch (error) {
    console.error("Erreur inscription livreur:", error);

    if (error.name === "SequelizeValidationError") {
      const messages = error.errors.map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Un livreur avec cet email existe déjà",
      });
    }

    res.status(500).json({
      success: false,
      message: "Erreur lors de la création du livreur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Définir le mot de passe après activation
 */
const setPassword = async (req, res) => {
  try {
    const { token, email, password } = req.body;

    if (!token || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Token, email et mot de passe sont requis",
      });
    }

    // Vérifier le token et sa validité
    const livreur = await Livreur.findOne({
      where: {
        email,
        reset_token: token,
        reset_token_expires: { [Op.gt]: new Date() },
      },
    });

    if (!livreur) {
      return res.status(400).json({
        success: false,
        message: "Token invalide ou expiré",
      });
    }

    // DEBUG: Voir ce qui se passe
    console.log("🔑 Mot de passe reçu (clair):", password);
    console.log("📊 Password avant update:", livreur.password?.substring(0, 30) + "...");

    // METTRE À JOUR AVEC LE MOT DE PASSE EN CLAIR
    // Le hook beforeUpdate va le hash automatiquement
    await livreur.update({
      password: password, // EN CLAIR - le hook s'en occupe
      statut: "actif",
      reset_token: null,
      reset_token_expires: null,
    });

    // Vérifier ce qui est stocké
    await livreur.reload();
    console.log("✅ Password après update:", livreur.password?.substring(0, 30) + "...");
    console.log("✅ Est un hash bcrypt?", livreur.password?.startsWith('$2'));

    res.json({
      success: true,
      message:
        "Mot de passe défini avec succès. Vous pouvez maintenant vous connecter.",
    });
  } catch (error) {
    console.error("Erreur définition mot de passe:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la définition du mot de passe",
    });
  }
};

/**
 * Récupérer tous les livreurs
 */
const getAllLivreurs = async (req, res) => {
  try {
    const { page = 1, limit = 10, statut, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};

    if (statut) {
      whereClause.statut = statut;
    }

    if (search) {
      whereClause[Op.or] = [
        { nom: { [Op.like]: `%${search}%` } },
        { prenom: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const livreurs = await Livreur.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ["password", "reset_token"] },
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      message: "Liste des livreurs récupérée avec succès",
      livreurs: livreurs.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(livreurs.count / limit),
        totalLivreurs: livreurs.count,
        hasNext: offset + livreurs.rows.length < livreurs.count,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Erreur récupération livreurs:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des livreurs",
    });
  }
};

/**
 * Récupérer un livreur par son ID
 */
const getLivreurById = async (req, res) => {
  try {
    const { id } = req.params;

    const livreur = await Livreur.findByPk(id, {
      attributes: { 
        exclude: ["password", "reset_token"] 
        // latitude et longitude sont automatiquement inclus
      },
    });

    if (!livreur) {
      return res.status(404).json({
        success: false,
        message: "Livreur non trouvé",
      });
    }

    res.json({
      success: true,
      message: "Livreur récupéré avec succès",
      livreur,
    });
  } catch (error) {
    console.error("Erreur récupération livreur:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération du livreur",
    });
  }
};

const updateLivreurPosition = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    const livreur = await Livreur.findByPk(id);

    if (!livreur) {
      return res.status(404).json({
        success: false,
        message: "Livreur non trouvé",
      });
    }

    await livreur.update({
      latitude,
      longitude,
      localisation_actuelle: `Lat: ${latitude}, Long: ${longitude}`,
      dernier_connection: new Date()
    });

    res.json({
      success: true,
      message: "Position mise à jour avec succès",
      livreur: {
        id: livreur.id,
        latitude: livreur.latitude,
        longitude: livreur.longitude,
        localisation_actuelle: livreur.localisation_actuelle,
        dernier_connection: livreur.dernier_connection
      },
    });
  } catch (error) {
    console.error("Erreur mise à jour position:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour de la position",
    });
  }
};

/**
 * Mettre à jour un livreur
 */
const updateLivreur = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const livreur = await Livreur.findByPk(id);

    if (!livreur) {
      return res.status(404).json({
        success: false,
        message: "Livreur non trouvé",
      });
    }

    // Exclure certains champs de la mise à jour
    delete updateData.password;
    delete updateData.reset_token;
    delete updateData.id;
    delete updateData.createdAt;

    await livreur.update(updateData);

    res.json({
      success: true,
      message: "Livreur mis à jour avec succès",
      livreur: {
        id: livreur.id,
        nom: livreur.nom,
        prenom: livreur.prenom,
        email: livreur.email,
        telephone: livreur.telephone,
        telephone_urgence: livreur.telephone_urgence,
        statut: livreur.statut,
        type_vehicule: livreur.type_vehicule,
        updatedAt: livreur.updatedAt,
      },
    });
  } catch (error) {
    console.error("Erreur mise à jour livreur:", error);

    if (error.name === "SequelizeValidationError") {
      const messages = error.errors.map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour du livreur",
    });
  }
};

/**
 * Supprimer un livreur (changer le statut)
 */
const deleteLivreur = async (req, res) => {
  try {
    const { id } = req.params;

    const livreur = await Livreur.findByPk(id);

    if (!livreur) {
      return res.status(404).json({
        success: false,
        message: "Livreur non trouvé",
      });
    }

    await livreur.update({ statut: "inactif" });

    res.json({
      success: true,
      message: "Livreur désactivé avec succès",
    });
  } catch (error) {
    console.error("Erreur suppression livreur:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression du livreur",
    });
  }
};

const getLivreurStats = async (req, res) => {
  try {
    // Compter tous les livreurs
    const totalLivreurs = await Livreur.count();

    // Compter par statut
    const livreursActifs = await Livreur.count({ where: { statut: "actif" } });
    const livreursEnAttente = await Livreur.count({
      where: { statut: "en_attente" },
    });
    const livreursInactifs = await Livreur.count({
      where: { statut: "inactif" },
    });
    const livreursEnConge = await Livreur.count({
      where: { statut: "en_conge" },
    });
    const livreursSuspendus = await Livreur.count({
      where: { statut: "suspendu" },
    });

    // Statistiques par type de véhicule - Version simplifiée
    const livreursAvecVehicule = await Livreur.findAll({
      where: { type_vehicule: { [Op.ne]: null } },
    });

    const statsParVehicule = {};
    livreursAvecVehicule.forEach((livreur) => {
      const type = livreur.type_vehicule;
      statsParVehicule[type] = (statsParVehicule[type] || 0) + 1;
    });

    // Convertir en format array
    const statsVehiculeArray = Object.entries(statsParVehicule).map(
      ([type_vehicule, count]) => ({
        type_vehicule,
        count,
      })
    );

    res.json({
      success: true,
      message: "Statistiques récupérées avec succès",
      stats: {
        total: totalLivreurs,
        actifs: livreursActifs,
        enAttente: livreursEnAttente,
        inactifs: livreursInactifs,
        enConge: livreursEnConge,
        suspendus: livreursSuspendus,
        statsParVehicule: statsVehiculeArray,
      },
    });
  } catch (error) {
    console.error("Erreur statistiques livreurs:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des statistiques",
    });
  }
};



// Exportez TOUTES les fonctions
module.exports = {
  registerLivreur,
  setPassword,
  getAllLivreurs,
  getLivreurById,
  updateLivreurPosition,
  updateLivreur,
  deleteLivreur,
  getLivreurStats,
};
