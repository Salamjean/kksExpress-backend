const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../../models/User");

// Fonction wrapper pour gérer les erreurs async
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Configuration JWT
const JWT_SECRET = process.env.JWT_SECRET || "votre_secret_jwt_user";
const JWT_EXPIRE = process.env.JWT_EXPIRE || "30d";

// @desc    Inscription d'un nouvel utilisateur
// @route   POST /api/auth/user/register
const registerUser = asyncHandler(async (req, res) => {
  const {
    nom,
    prenom,
    email,
    telephone,
    password,
    adresse,
    ville,
    genre,
  } = req.body;

  console.log("📝 Inscription utilisateur pour:", email);

  // Validation des champs requis
  if (!nom || !prenom || !email || !telephone || !password || !adresse || !ville) {
    return res.status(400).json({
      success: false,
      message: "Tous les champs obligatoires doivent être remplis",
    });
  }

  // Validation du mot de passe
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Le mot de passe doit contenir au moins 6 caractères",
    });
  }

  // Vérifier si l'email existe déjà
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "Un utilisateur avec cet email existe déjà",
    });
  }

  // Vérifier si le téléphone existe déjà
  const existingPhone = await User.findOne({ where: { telephone } });
  if (existingPhone) {
    return res.status(400).json({
      success: false,
      message: "Un utilisateur avec ce téléphone existe déjà",
    });
  }

  try {
    // Créer le nouvel utilisateur
    const user = await User.create({
      nom,
      prenom,
      email,
      telephone,
      password,
      adresse,
      ville,
      genre: genre || null,
      statut: "actif",
      email_verifie: false,
    });

    console.log("✅ Utilisateur créé avec ID:", user.id);

    // Générer un token JWT pour connexion automatique
    const token = jwt.sign(
      {
        id: user.id,
        role: "user",
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    // ENVOYER L'EMAIL DE CONFIRMATION (ajouté)
    try {
      const { sendWelcomeEmail } = require("../../utils/emailService");
      
      console.log("📤 Envoi email de bienvenue...");
      await sendWelcomeEmail(email, user.nom, user.prenom);
      
      console.log("✅ Email de bienvenue envoyé");
      
    } catch (emailError) {
      console.error("⚠️ Erreur envoi email de bienvenue:", emailError.message);
      // Ne pas bloquer l'inscription si l'email échoue
    }

    // Retourner la réponse sans le mot de passe
    const userResponse = user.toJSON();
    delete userResponse.password;
    delete userResponse.reset_token;
    delete userResponse.reset_token_expires;

    return res.status(201).json({
      success: true,
      message: "Inscription réussie. Bienvenue! Un email de confirmation vous a été envoyé.",
      token,
      user: userResponse,
      email_sent: true, // Indiquer que l'email a été envoyé
    });

  } catch (error) {
    console.error("💥 Erreur lors de l'inscription:", error);

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
        message: "Un utilisateur avec cet email ou téléphone existe déjà",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Erreur lors de l'inscription",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// @desc    Connexion d'un utilisateur
// @route   POST /api/auth/user/login
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  console.log("🔐 Tentative de connexion utilisateur:", email);

  // Validation des champs
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Veuillez fournir un email et un mot de passe",
    });
  }

  // Recherche de l'utilisateur avec le mot de passe
  const user = await User.findOne({
    where: { email },
    attributes: { include: ["password"] },
  });

  if (!user) {
    console.log("❌ Utilisateur non trouvé pour:", email);
    return res.status(401).json({
      success: false,
      message: "Identifiants invalides",
    });
  }

  console.log("✅ Utilisateur trouvé ID:", user.id);
  console.log("📌 Statut:", user.statut);
  console.log("📧 Email vérifié:", user.email_verifie);

  // Vérification du mot de passe
  try {
    console.log("🔍 Vérification du mot de passe...");
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log("❌ Mot de passe invalide pour:", email);
      return res.status(401).json({
        success: false,
        message: "Identifiants invalides",
      });
    }

    console.log("✅ Mot de passe valide");
  } catch (error) {
    console.error("💥 Erreur lors de la vérification:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la vérification du mot de passe",
    });
  }

  // Vérification du statut
  if (user.statut !== "actif") {
    console.log("❌ Compte non actif:", user.statut);
    return res.status(403).json({
      success: false,
      message: "Votre compte n'est pas actif. Contactez le support.",
    });
  }

// Vérifier si le compte est marqué pour suppression
if (user.demande_suppression) {
  // Vérifier si les 30 jours sont écoulés
  const trenteJours = 30 * 24 * 60 * 60 * 1000;
  const maintenant = new Date();
  
  if (user.date_demande_suppression && 
      maintenant - user.date_demande_suppression > trenteJours) {
    console.log("❌ Compte supprimé définitivement après 30 jours");
    
    // Marquer comme définitivement supprimé
    user.compte_supprime = true;
    user.date_suppression_effective = new Date();
    await user.save();
    
    return res.status(403).json({
      success: false,
      message: "Votre compte a été définitivement supprimé après 30 jours d'inactivité",
      code: "ACCOUNT_PERMANENTLY_DELETED"
    });
  }
  
  // Si on arrive ici, c'est que la période de grâce n'est pas terminée
  // On annule la suppression puisque l'utilisateur se reconnecte
  user.demande_suppression = false;
  user.date_demande_suppression = null;
  await user.save();
  
  console.log("🔄 Suppression annulée - utilisateur s'est reconnecté");
}

  // Optionnel: Vérifier si l'email est vérifié
  if (!user.email_verifie) {
    console.log("⚠️ Email non vérifié pour:", email);
    // Vous pouvez décider de bloquer ou non
    // return res.status(403).json({
    //   success: false,
    //   message: "Veuillez vérifier votre email avant de vous connecter",
    // });
  }

  // Mettre à jour la dernière connexion
  try {
    await user.marquerConnecte();
    console.log("✅ Dernière connexion mise à jour");
  } catch (error) {
    console.error("⚠️ Erreur mise à jour dernière connexion:", error);
  }

  // Génération du token JWT
  const token = jwt.sign(
    {
      id: user.id,
      role: "user",
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );

  console.log("✅ Token généré pour user ID:", user.id);

  // Préparer la réponse sans données sensibles
  const userResponse = user.toJSON();
  delete userResponse.password;
  delete userResponse.reset_token;
  delete userResponse.reset_token_expires;

  return res.status(200).json({
    success: true,
    message: "Connexion réussie",
    token,
    user: userResponse,
  });
});

// @desc    Déconnexion d'un utilisateur
// @route   POST /api/auth/user/logout
const logoutUser = asyncHandler(async (req, res) => {
  try {
    console.log("🚪 Déconnexion demandée pour user ID:", req.user?.id);

    // Ici, vous pourriez invalider le token côté serveur si nécessaire
    // Pour un système JWT stateless, on ne fait généralement rien côté serveur

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

// @desc    Obtenir le profil de l'utilisateur connecté
// @route   GET /api/auth/user/profile
const getMyProfile = asyncHandler(async (req, res) => {
  console.log("👤 Récupération profil pour user ID:", req.user?.id);

  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ["password", "reset_token", "reset_token_expires"] },
  });

  if (!user) {
    console.log("❌ Utilisateur non trouvé pour ID:", req.user.id);
    return res.status(404).json({
      success: false,
      message: "Utilisateur non trouvé",
    });
  }

  console.log("✅ Profil récupéré pour:", user.email);

  return res.status(200).json({
    success: true,
    user,
  });
});

// @desc    Mettre à jour le profil de l'utilisateur connecté
// @route   PUT /api/auth/user/profile
const updateMyProfile = asyncHandler(async (req, res) => {
  console.log("✏️ Mise à jour profil pour user ID:", req.user?.id);
  console.log("📝 Données reçues:", req.body);

  const {
    nom,
    prenom,
    email,
    telephone,
    adresse,
    ville,
    genre,
    photo_profil,
    latitude,
    longitude,
  } = req.body;

  const user = await User.findByPk(req.user.id);

  if (!user) {
    console.log("❌ Utilisateur non trouvé pour ID:", req.user.id);
    return res.status(404).json({
      success: false,
      message: "Utilisateur non trouvé",
    });
  }

  // Vérification si l'email existe déjà (sauf pour l'utilisateur actuel)
  if (email && email !== user.email) {
    const emailExists = await User.findOne({ where: { email } });
    if (emailExists) {
      console.log("❌ Email déjà utilisé:", email);
      return res.status(400).json({
        success: false,
        message: "Cet email est déjà utilisé",
      });
    }
  }

  // Vérification si le téléphone existe déjà
  if (telephone && telephone !== user.telephone) {
    const phoneExists = await User.findOne({ where: { telephone } });
    if (phoneExists) {
      console.log("❌ Téléphone déjà utilisé:", telephone);
      return res.status(400).json({
        success: false,
        message: "Ce téléphone est déjà utilisé",
      });
    }
  }

  // Mise à jour des champs autorisés
  const updateData = {};

  if (nom !== undefined) updateData.nom = nom;
  if (prenom !== undefined) updateData.prenom = prenom;
  if (email !== undefined) updateData.email = email;
  if (telephone !== undefined) updateData.telephone = telephone;
  if (adresse !== undefined) updateData.adresse = adresse;
  if (ville !== undefined) updateData.ville = ville;
  if (genre !== undefined) updateData.genre = genre;
  if (photo_profil !== undefined) updateData.photo_profil = photo_profil;
  if (latitude !== undefined) updateData.latitude = latitude;
  if (longitude !== undefined) updateData.longitude = longitude;

  // Mise à jour de l'utilisateur
  await user.update(updateData);

  // Rafraîchir les données
  await user.reload();

  console.log("✅ Profil mis à jour pour:", user.email);

  // Préparer la réponse sans données sensibles
  const userResponse = user.toJSON();
  delete userResponse.password;
  delete userResponse.reset_token;
  delete userResponse.reset_token_expires;

  return res.status(200).json({
    success: true,
    message: "Profil mis à jour avec succès",
    user: userResponse,
  });
});

// @desc    Changer le mot de passe de l'utilisateur
// @route   PUT /api/auth/user/change-password
const changePassword = asyncHandler(async (req, res) => {
  console.log("🔑 Changement mot de passe pour user ID:", req.user?.id);

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

  // Récupérer l'utilisateur avec le mot de passe
  const user = await User.findByPk(req.user.id, {
    attributes: { include: ["password"] },
  });

  if (!user) {
    console.log("❌ Utilisateur non trouvé pour ID:", req.user.id);
    return res.status(404).json({
      success: false,
      message: "Utilisateur non trouvé",
    });
  }

  // Vérification de l'ancien mot de passe
  try {
    console.log("🔍 Vérification ancien mot de passe...");
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

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
  user.password = newPassword;
  await user.save();

  console.log("✅ Mot de passe changé pour:", user.email);

  return res.status(200).json({
    success: true,
    message: "Mot de passe modifié avec succès",
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("📱 DEMANDE CODE OTP POUR RÉINITIALISATION");
  console.log("=".repeat(60));

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Veuillez fournir votre adresse email",
    });
  }

  console.log("📧 Email reçu:", email);

  try {
    // Rechercher l'utilisateur
    const user = await User.findOne({ where: { email } });

    if (!user) {
      console.log("❌ Aucun compte avec cet email");
      return res.status(404).json({
        success: false,
        message: "Cet email n'est associé à aucun compte utilisateur",
        suggestion: "Vérifiez l'adresse ou créez un nouveau compte",
      });
    }

    console.log("✅ Utilisateur trouvé:", user.nom, user.prenom);

    // Vérifier si le compte est actif
    if (user.statut !== "actif") {
      console.log("❌ Compte inactif:", user.statut);
      return res.status(403).json({
        success: false,
        message: "Votre compte n'est pas actif. Contactez le support.",
      });
    }

    // Vérifier si l'utilisateur est bloqué temporairement
    if (user.otp_locked_until && user.otp_locked_until > new Date()) {
      const minutesRestantes = Math.ceil(
        (user.otp_locked_until - new Date()) / 60000
      );
      console.log(`🔒 Compte bloqué pour ${minutesRestantes} minutes`);

      return res.status(429).json({
        success: false,
        message: `Trop de tentatives. Réessayez dans ${minutesRestantes} minute(s)`,
        locked_until: user.otp_locked_until,
      });
    }

    // Générer un OTP à 4 chiffres
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    console.log("🔢 Code OTP généré:", otpCode);

    // Mettre à jour l'utilisateur avec l'OTP
    user.otp_code = otpCode;
    user.otp_expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.otp_attempts = 0; // Réinitialiser les tentatives
    user.otp_locked_until = null; // Débloquer si nécessaire
    await user.save();

    console.log("⏰ OTP expire le:", user.otp_expires.toLocaleString());

    // Envoyer l'email avec l'OTP
    try {
      const { sendOTPCodeEmail } = require("../../utils/emailService");

      console.log("📤 Envoi de l'email OTP...");
      await sendOTPCodeEmail(email, user.nom, user.prenom, otpCode);

      console.log("✅ Email OTP envoyé");

      return res.status(200).json({
        success: true,
        message:
          "Un code de vérification à 4 chiffres a été envoyé à votre adresse email",
        instructions: [
          "1. Vérifiez votre boîte de réception (et vos spams)",
          "2. Copiez le code à 4 chiffres",
          "3. Retournez sur l'application et saisissez le code",
          "4. Choisissez votre nouveau mot de passe",
        ],
        hint: "Le code est valable 10 minutes",

        // En mode développement seulement
        ...(process.env.NODE_ENV === "development" && {
          debug_info: {
            note: "Mode développement - code visible pour test",
            otp_code: otpCode,
            expires: user.otp_expires,
            email: email,
          },
        }),
      });
    } catch (emailError) {
      console.error("💥 Erreur envoi email:", emailError.message);

      // Nettoyer l'OTP en cas d'erreur
      user.otp_code = null;
      user.otp_expires = null;
      await user.save();

      return res.status(500).json({
        success: false,
        message: "Erreur d'envoi du code. Veuillez réessayer.",
        ...(process.env.NODE_ENV === "development" && {
          error: emailError.message,
          otp_code: otpCode, // Retourner le code pour test en dev
        }),
      });
    }
  } catch (error) {
    console.error("💥 Erreur:", error.message);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors du traitement de votre demande",
    });
  } finally {
    console.log("=".repeat(60) + "\n");
  }
});

// @desc    Vérifier le code OTP et autoriser la réinitialisation
// @route   POST /api/auth/user/verify-otp
const verifyOTP = asyncHandler(async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("🔍 VÉRIFICATION CODE OTP");
  console.log("=".repeat(60));

  const { email, otp_code } = req.body;

  if (!email || !otp_code) {
    return res.status(400).json({
      success: false,
      message: "Email et code OTP requis",
    });
  }

  console.log("📧 Email:", email);
  console.log("🔢 Code OTP reçu:", otp_code);

  try {
    // Rechercher l'utilisateur
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    console.log("✅ Utilisateur trouvé:", user.nom);

    // Vérifier si le compte est bloqué
    if (user.otp_locked_until && user.otp_locked_until > new Date()) {
      const minutesRestantes = Math.ceil(
        (user.otp_locked_until - new Date()) / 60000
      );
      return res.status(429).json({
        success: false,
        message: `Trop de tentatives. Réessayez dans ${minutesRestantes} minute(s)`,
      });
    }

    // Vérifier si l'OTP a expiré
    if (!user.otp_expires || user.otp_expires < new Date()) {
      console.log("❌ OTP expiré");

      // Incrémenter les tentatives
      user.otp_attempts += 1;

      // Bloquer après 5 tentatives
      if (user.otp_attempts >= 5) {
        user.otp_locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }

      await user.save();

      return res.status(400).json({
        success: false,
        message: "Le code a expiré. Veuillez en demander un nouveau.",
        attempts_remaining: Math.max(0, 5 - user.otp_attempts),
      });
    }

    // Vérifier le code OTP
    if (user.otp_code !== otp_code) {
      console.log("❌ Code OTP incorrect");

      // Incrémenter les tentatives
      user.otp_attempts += 1;
      console.log(`Tentative ${user.otp_attempts}/5`);

      // Bloquer après 5 tentatives
      if (user.otp_attempts >= 5) {
        user.otp_locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        console.log(`🔒 Compte bloqué 30 minutes`);
      }

      await user.save();

      const attemptsRemaining = 5 - user.otp_attempts;

      return res.status(400).json({
        success: false,
        message: `Code incorrect. ${
          attemptsRemaining > 0
            ? `${attemptsRemaining} tentatives restantes`
            : "Compte temporairement bloqué"
        }`,
        attempts_remaining: attemptsRemaining > 0 ? attemptsRemaining : 0,
        ...(user.otp_attempts >= 5 && {
          locked: true,
          locked_minutes: 30,
        }),
      });
    }

    // ✅ Code OTP correct !
    console.log("✅ Code OTP correct!");

    // Générer un token de session pour autoriser la réinitialisation
    const crypto = require("crypto");
    const sessionToken = crypto.randomBytes(32).toString("hex");

    // Stocker le token en session (vous pouvez utiliser redis ou une table sessions)
    // Pour simplifier, on le stocke dans l'utilisateur
    user.reset_token = sessionToken;
    user.reset_token_expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Nettoyer l'OTP
    user.otp_code = null;
    user.otp_expires = null;
    user.otp_attempts = 0;
    user.otp_locked_until = null;

    await user.save();

    console.log("🔐 Session de réinitialisation créée");
    console.log("⏰ Session valide 15 minutes");

    return res.status(200).json({
      success: true,
      message:
        "Code vérifié avec succès. Vous pouvez maintenant définir un nouveau mot de passe.",
      session_token: sessionToken, // À utiliser pour la prochaine requête
      expires_in: 900, // 15 minutes en secondes
      next_step:
        "Utilisez ce token avec la route POST /api/auth/user/reset-password",
      instructions: {
        endpoint: "POST /api/auth/user/reset-password",
        headers: {
          Authorization: "Bearer VOTRE_SESSION_TOKEN",
          "Content-Type": "application/json",
        },
        body: {
          newPassword: "VotreNouveauMotDePasse",
        },
      },
    });
  } catch (error) {
    console.error("💥 Erreur:", error.message);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    console.log("=".repeat(60) + "\n");
  }
});

// @desc    Réinitialiser le mot de passe après vérification OTP
// @route   POST /api/auth/user/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("🔄 RÉINITIALISATION MOT DE PASSE");
  console.log("=".repeat(60));

  const { session_token, newPassword } = req.body;

  if (!session_token || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Token de session et nouveau mot de passe requis",
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Le mot de passe doit contenir au moins 6 caractères",
    });
  }

  console.log("🔐 Session token:", session_token.substring(0, 20) + "...");
  console.log("🔑 Nouveau mot de passe:", "***");

  try {
    // Trouver l'utilisateur avec le token de session valide
    const user = await User.findOne({
      where: {
        reset_token: session_token,
        reset_token_expires: { [require("sequelize").Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Session invalide ou expirée. Veuillez recommencer la procédure.",
      });
    }

    console.log("✅ Session valide pour:", user.email);

    // Mettre à jour le mot de passe
    user.password = newPassword; // Le hook beforeUpdate va hasher
    user.reset_token = null;
    user.reset_token_expires = null;
    await user.save();

    console.log("✅ Mot de passe mis à jour pour:", user.email);

    return res.status(200).json({
      success: true,
      message: "Mot de passe réinitialisé avec succès !",
      instructions:
        "Vous pouvez maintenant vous connecter avec votre nouveau mot de passe",
      next_step:
        "POST /api/auth/user/login avec votre email et nouveau mot de passe",
    });
  } catch (error) {
    console.error("💥 Erreur:", error.message);

    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    console.log("=".repeat(60) + "\n");
  }
});

// @desc    Demander la suppression du compte utilisateur
// @route   DELETE /api/auth/user/account
const deleteMyAccount = asyncHandler(async (req, res) => {
  console.log("🗑️ Demande suppression compte pour user ID:", req.user?.id);

  const user = await User.findByPk(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Utilisateur non trouvé",
    });
  }

  // Marquer pour suppression avec date
  user.demande_suppression = true;
  user.date_demande_suppression = new Date();
  await user.save();

  console.log("✅ Compte marqué pour suppression:", user.email);
  console.log("📅 Date de demande:", user.date_demande_suppression);

  return res.status(200).json({
    success: true,
    message:
      "Votre compte a été marqué pour suppression. Vous avez 30 jours pour vous reconnecter si vous changez d'avis.",
    warning:
      "Si vous ne vous reconnectez pas dans les 30 prochains jours, votre compte sera définitivement supprimé.",
    date_demande: user.date_demande_suppression,
    date_limite_reconnexion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 jours
  });
});

// @desc    Annuler la suppression du compte utilisateur
// @route   POST /api/auth/user/account/cancel-deletion
const cancelAccountDeletion = asyncHandler(async (req, res) => {
  console.log("↩️ Annulation suppression compte pour user ID:", req.user?.id);

  const user = await User.findByPk(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Utilisateur non trouvé",
    });
  }

  // Annuler la demande de suppression
  user.demande_suppression = false;
  user.date_demande_suppression = null;
  await user.save();

  console.log("✅ Suppression annulée pour:", user.email);

  return res.status(200).json({
    success: true,
    message: "La suppression de votre compte a été annulée.",
    user: {
      id: user.id,
      email: user.email,
      demande_suppression: user.demande_suppression,
    },
  });
});

// @desc    Supprimer définitivement le compte (après 30 jours)
// @route   DELETE /api/auth/user/account/permanent
// Note: Cette route serait typiquement appelée par un cron job
const permanentDeleteAccount = asyncHandler(async (req, res) => {
  console.log(
    "💀 Suppression permanente pour user ID:",
    req.params.id || req.user?.id
  );

  const userId = req.params.id || req.user?.id;
  const user = await User.findByPk(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Utilisateur non trouvé",
    });
  }

  // Vérifier si les 30 jours sont écoulés
  if (!user.demande_suppression || !user.date_demande_suppression) {
    return res.status(400).json({
      success: false,
      message: "Ce compte n'est pas marqué pour suppression",
    });
  }

  const trenteJours = 30 * 24 * 60 * 60 * 1000;
  const maintenant = new Date();

  if (maintenant - user.date_demande_suppression < trenteJours) {
    const joursRestants = Math.ceil(
      (trenteJours - (maintenant - user.date_demande_suppression)) /
        (24 * 60 * 60 * 1000)
    );

    return res.status(400).json({
      success: false,
      message: `Il reste ${joursRestants} jour(s) avant la suppression définitive`,
      date_suppression: new Date(
        user.date_demande_suppression.getTime() + trenteJours
      ),
    });
  }

  // Suppression définitive
  user.compte_supprime = true;
  user.date_suppression_effective = new Date();
  user.statut = "inactif";
  await user.save();

  // OU pour vraiment supprimer de la base:
  // await user.destroy();

  console.log("✅ Compte définitivement supprimé:", user.email);

  return res.status(200).json({
    success: true,
    message: "Compte supprimé définitivement",
    user_id: user.id,
    date_suppression: user.date_suppression_effective,
  });
});

module.exports = {
  registerUser,
  loginUser,
  cancelAccountDeletion,
  permanentDeleteAccount,
  deleteMyAccount,
  verifyOTP,
  logoutUser,
  getMyProfile,
  updateMyProfile,
  changePassword,
  forgotPassword,
  resetPassword,
};
