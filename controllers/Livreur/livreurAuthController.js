// controllers/livreur/livreurAuthController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Livreur = require("../../models/Livreur");

// Fonction wrapper pour gérer les erreurs async
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
const JWT_SECRET = process.env.JWT_SECRET || "votre_secret_jwt_livreur";
const JWT_EXPIRE = process.env.JWT_EXPIRE || "30d";

// Connexion d'un livreur
// @route   POST /api/auth/livreur/login
const loginLivreur = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  console.log("🔐 Tentative de connexion pour:", email);
  console.log("🔑 Mot de passe reçu:", password ? "présent" : "absent");

  // Validation des champs
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Veuillez fournir un email et un mot de passe",
    });
  }

  // Recherche du livreur avec le mot de passe
  const livreur = await Livreur.findOne({
    where: { email },
    attributes: { include: ["password"] },
  });

  if (!livreur) {
    console.log("❌ Livreur non trouvé pour l'email:", email);
    return res.status(401).json({
      success: false,
      message: "Identifiants invalides",
    });
  }

  console.log("✅ Livreur trouvé ID:", livreur.id);
  console.log("📌 Statut:", livreur.statut);
  console.log("📧 Email:", livreur.email);
  
  // DEBUG: Afficher le mot deppe stocké (pour debug seulement)
  console.log("🔐 Password stocké (hashé):", livreur.password ? "présent" : "absent");
  console.log("📏 Longueur du hash:", livreur.password?.length);

  // Vérification du mot de passe avec bcrypt.compare
  try {
    console.log("🔍 Début de la comparaison bcrypt...");
    
    // Nettoyer les chaînes
    const cleanPassword = password.trim();
    const cleanHash = livreur.password ? livreur.password.trim() : "";
    
    console.log("🧹 Password nettoyé:", cleanPassword);
    console.log("🧹 Hash nettoyé:", cleanHash.substring(0, 20) + "...");
    
    const isBcryptHash = cleanHash.startsWith('$2');
    console.log("📌 Est un hash bcrypt?", isBcryptHash);
    
    let isPasswordValid = false;
    
    if (isBcryptHash) {
      isPasswordValid = await bcrypt.compare(cleanPassword, cleanHash);
      console.log("✅ bcrypt.compare résultat:", isPasswordValid);
    } else if (cleanHash) {
      console.log("⚠️ Ce n'est pas un hash bcrypt, test de correspondance directe");
      isPasswordValid = (cleanPassword === cleanHash);
      console.log("✅ Correspondance directe:", isPasswordValid);
      
      if (isPasswordValid) {
        console.log("🚨 ATTENTION: Le mot de passe n'est pas hashé! Hashage en cours...");
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(cleanPassword, salt);
        await livreur.update({ password: hashedPassword });
        console.log("✅ Mot de passe hashé et mis à jour en base");
      }
    } else {
      console.log("❌ Pas de mot de passe enregistré en base pour ce livreur");
      isPasswordValid = false;
    }

    if (!isPasswordValid) {
      console.log("❌ Mot de passe invalide pour:", email);
      return res.status(401).json({
        success: false,
        message: "Identifiants invalides",
      });
    }
    
    console.log("✅ Mot de passe valide pour:", email);
    
  } catch (error) {
    console.error("💥 Erreur lors de la comparaison:", error);
    console.error("💥 Stack trace:", error.stack);
    return res.status(401).json({
      success: false,
      message: "Erreur lors de la vérification du mot de passe",
    });
  }

  // Vérification du statut
  if (livreur.statut !== "actif") {
    const statutMessages = {
      inactif: "Votre compte est inactif. Contactez l'administrateur.",
      en_conge: "Vous êtes actuellement en congé.",
      suspendu: "Votre compte est suspendu. Contactez l'administrateur.",
    };
    console.log("❌ Compte non actif:", livreur.statut);
    return res.status(403).json({
      success: false,
      message: statutMessages[livreur.statut] || "Votre compte n'est pas actif",
    });
  }

  // Mettre à jour la dernière connexion
  try {
    if (livreur.marquerConnecte) {
      await livreur.marquerConnecte();
      console.log("✅ Dernière connexion mise à jour");
    }
  } catch (error) {
    console.error("⚠️ Erreur mise à jour dernière connexion:", error);
  }

  // Génération du token JWT
  const token = jwt.sign(
    {
      id: livreur.id,
      role: "livreur",
      email: livreur.email,
      nom: livreur.nom,
      prenom: livreur.prenom,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );

  console.log("✅ Token généré pour livreur ID:", livreur.id);
  console.log("✅ Connexion réussie pour:", livreur.email);

  // Envoi de la réponse
  return res.status(200).json({
    success: true,
    token,
    livreur: {
      id: livreur.id,
      nom: livreur.nom,
      prenom: livreur.prenom,
      email: livreur.email,
      telephone: livreur.telephone,
      telephone_urgence: livreur.telephone_urgence,
      type_vehicule: livreur.type_vehicule,
      plaque_immatriculation: livreur.plaque_immatriculation,
      statut: livreur.statut,
      is_online: livreur.is_online,
      dernier_connection: livreur.dernier_connection,
      localisation_actuelle: livreur.localisation_actuelle,
      createdAt: livreur.createdAt,
    },
  });
});

// @Déconnexion d'un livreur
// @route   POST /api/auth/livreur/logout
const logoutLivreur = asyncHandler(async (req, res) => {
  try {
    console.log("🚪 Déconnexion demandée pour livreur ID:", req.livreur?.id);
    
    // Marquer le livreur comme déconnecté
    if (req.livreur && req.livreur.marquerDeconnecte) {
      await req.livreur.marquerDeconnecte();
    }

    return res.status(200).json({
      success: true,
      message: "Déconnexion réussie",
    });
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la déconnexion",
    });
  }
});

// Obtenir le profil du livreur connecté
// @route   GET /api/auth/livreur/profile
const getMyProfile = asyncHandler(async (req, res) => {
  console.log("👤 Récupération profil pour livreur ID:", req.livreur?.id);
  
  // req.livreur est défini par le middleware protectLivreur
  const livreur = await Livreur.findByPk(req.livreur.id, {
    attributes: { exclude: ["password"] },
  });

  if (!livreur) {
    console.log("❌ Livreur non trouvé en base pour ID:", req.livreur.id);
    return res.status(404).json({
      success: false,
      message: "Livreur non trouvé",
    });
  }

  console.log("✅ Profil récupéré pour:", livreur.email);
  
  return res.status(200).json({
    success: true,
    livreur,
  });
});

// @desc    Mettre à jour le profil du livreur connecté
// @route   PUT /api/auth/livreur/profile
const updateMyProfile = asyncHandler(async (req, res) => {
  console.log("✏️ Mise à jour profil pour livreur ID:", req.livreur?.id);
  console.log("📝 Données reçues:", req.body);
  
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
    localisation_actuelle,
  } = req.body;

  const livreur = await Livreur.findByPk(req.livreur.id);

  if (!livreur) {
    console.log("❌ Livreur non trouvé pour ID:", req.livreur.id);
    return res.status(404).json({
      success: false,
      message: "Livreur non trouvé",
    });
  }

  // Vérification si l'email existe déjà (sauf pour le livreur actuel)
  if (email && email !== livreur.email) {
    const emailExists = await Livreur.findOne({
      where: { email },
    });
    if (emailExists) {
      console.log("❌ Email déjà utilisé:", email);
      return res.status(400).json({
        success: false,
        message: "Cet email est déjà utilisé",
      });
    }
  }

  // Mise à jour des champs autorisés
  const updateData = {};

  if (nom !== undefined) updateData.nom = nom;
  if (prenom !== undefined) updateData.prenom = prenom;
  if (email !== undefined) updateData.email = email;
  if (telephone !== undefined) updateData.telephone = telephone;
  if (telephone_urgence !== undefined)
    updateData.telephone_urgence = telephone_urgence;
  if (adresse !== undefined) updateData.adresse = adresse;
  if (date_naissance !== undefined) updateData.date_naissance = date_naissance;
  if (numero_permis !== undefined) updateData.numero_permis = numero_permis;
  if (type_vehicule !== undefined) updateData.type_vehicule = type_vehicule;
  if (plaque_immatriculation !== undefined)
    updateData.plaque_immatriculation = plaque_immatriculation;
  if (localisation_actuelle !== undefined) {
    updateData.localisation_actuelle = localisation_actuelle;
    // Optionnel: déclencher aussi la méthode de mise à jour
    if (livreur.mettreAJourLocalisation) {
      await livreur.mettreAJourLocalisation(localisation_actuelle);
    }
  }

  // Mise à jour du livreur
  await livreur.update(updateData);

  // Rafraîchir les données pour obtenir les valeurs mises à jour
  await livreur.reload();

  console.log("✅ Profil mis à jour pour:", livreur.email);
  
  // Retourner les données
  return res.status(200).json({
    success: true,
    message: "Profil mis à jour avec succès",
    livreur: livreur.toJSON(),
  });
});

// @desc    Changer le mot de passe du livreur
// @route   PUT /api/auth/livreur/change-password
const changePassword = asyncHandler(async (req, res) => {
  console.log("🔑 Changement mot de passe pour livreur ID:", req.livreur?.id);
  
  const { currentPassword, newPassword } = req.body;

  // Validation
  if (!currentPassword || !newPassword) {
    console.log("❌ Champs manquants pour changement de mot de passe");
    return res.status(400).json({
      success: false,
      message: "Veuillez fournir l'ancien et le nouveau mot de passe",
    });
  }

  if (newPassword.length < 6) {
    console.log("❌ Nouveau mot de passe trop court:", newPassword.length);
    return res.status(400).json({
      success: false,
      message: "Le nouveau mot de passe doit contenir au moins 6 caractères",
    });
  }

  // Récupérer le livreur avec le mot de passe
  const livreur = await Livreur.findByPk(req.livreur.id, {
    attributes: { include: ["password"] },
  });

  if (!livreur) {
    console.log("❌ Livreur non trouvé pour ID:", req.livreur.id);
    return res.status(404).json({
      success: false,
      message: "Livreur non trouvé",
    });
  }

  // Vérification de l'ancien mot de passe avec bcrypt
  try {
    console.log("🔍 Vérification ancien mot de passe...");
    const isPasswordValid = await bcrypt.compare(currentPassword, livreur.password);
    
    if (!isPasswordValid) {
      console.log("❌ Mot de passe actuel incorrect");
      return res.status(401).json({
        success: false,
        message: "Mot de passe actuel incorrect",
      });
    }
    console.log("✅ Ancien mot de passe correct");
  } catch (error) {
    console.error("💥 Erreur lors de la vérification:", error);
    return res.status(401).json({
      success: false,
      message: "Erreur lors de la vérification du mot de passe",
    });
  }

  // Mise à jour du mot de passe (le hook beforeUpdate hash automatiquement)
  livreur.password = newPassword;
  await livreur.save();

  console.log("✅ Mot de passe changé pour:", livreur.email);
  
  return res.status(200).json({
    success: true,
    message: "Mot de passe modifié avec succès",
  });
});



module.exports = {
  loginLivreur,
  logoutLivreur,
  getMyProfile,
  updateMyProfile,
  changePassword,
};