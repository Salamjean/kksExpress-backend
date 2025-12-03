const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "votre_secret_jwt_user";

/**
 * Middleware de protection pour les utilisateurs
 */
const protectUser = async (req, res, next) => {
  try {
    console.log("🛡️ Middleware protectUser déclenché");

    // Récupérer le token du header Authorization
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
      console.log("🔐 Token récupéré depuis header");
    }

    // Vérifier si le token existe
    if (!token) {
      console.log("❌ Token manquant");
      return res.status(401).json({
        success: false,
        message: "Accès non autorisé. Veuillez vous connecter.",
      });
    }

    try {
      // Vérifier et décoder le token
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log("✅ Token valide - User ID:", decoded.id);

      // Vérifier le rôle
      if (decoded.role !== "user") {
        console.log("❌ Rôle incorrect:", decoded.role);
        return res.status(403).json({
          success: false,
          message: "Accès réservé aux utilisateurs",
        });
      }

      // Récupérer l'utilisateur depuis la base de données
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ["password", "reset_token"] },
      });

      if (!user) {
        console.log("❌ Utilisateur non trouvé en base");
        return res.status(401).json({
          success: false,
          message: "Utilisateur non trouvé.",
        });
      }

      // Vérifier si le compte est actif (utilisez la nouvelle méthode)
      if (user.statut !== "actif") {
        console.log("❌ Compte utilisateur inactif:", user.statut);
        return res.status(403).json({
          success: false,
          message: "Votre compte n'est pas actif. Contactez le support.",
        });
      }

      // ICI : Ajoutez la vérification de la suppression de compte
      // Vérifier si l'utilisateur peut se connecter (prise en compte de la suppression)
      if (typeof user.peutSeConnecter === 'function') {
        if (!user.peutSeConnecter()) {
          console.log("❌ Compte marqué pour suppression ou supprimé");
          return res.status(403).json({
            success: false,
            message: "Votre compte n'est pas accessible (marqué pour suppression ou supprimé).",
          });
        }
      } else {
        // Fallback si la méthode n'existe pas encore (avant migration)
        if (user.demande_suppression) {
          const trenteJours = 30 * 24 * 60 * 60 * 1000;
          const maintenant = new Date();
          
          if (user.date_demande_suppression && 
              maintenant - user.date_demande_suppression > trenteJours) {
            console.log("❌ Compte supprimé définitivement après 30 jours");
            return res.status(403).json({
              success: false,
              message: "Votre compte a été définitivement supprimé après 30 jours d'inactivité.",
            });
          }
          
          // Annuler la suppression si l'utilisateur se reconnecte avant 30 jours
          user.demande_suppression = false;
          user.date_demande_suppression = null;
          await user.save();
          console.log("🔄 Suppression annulée - utilisateur s'est reconnecté");
        }
        
        if (user.compte_supprime) {
          console.log("❌ Compte définitivement supprimé");
          return res.status(403).json({
            success: false,
            message: "Votre compte a été définitivement supprimé.",
          });
        }
      }

      // Ajouter l'utilisateur à l'objet request
      req.user = user;
      console.log("✅ Utilisateur authentifié:", user.prenom, user.nom);

      next();
    } catch (jwtError) {
      console.log("❌ Erreur JWT:", jwtError.message);
      return res.status(401).json({
        success: false,
        message: "Token invalide ou expiré. Veuillez vous reconnecter.",
      });
    }
  } catch (error) {
    console.error("💥 Erreur middleware user:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur d'authentification.",
    });
  }
};

module.exports = {
  protectUser,
};