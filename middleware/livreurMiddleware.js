// middleware/livreurMiddleware.js
const jwt = require("jsonwebtoken");
const Livreur = require("../models/Livreur");

// MÊME CONSTANTE QUE DANS LE CONTRÔLEUR
const JWT_SECRET = process.env.JWT_SECRET || "votre_secret_jwt_livreur";

const protectLivreur = async (req, res, next) => {
  try {
    console.log("🛡️ Middleware protectLivreur déclenché");
    console.log("📌 Secret configuré:", JWT_SECRET);

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
        message: "Accès non autorisé. Token manquant.",
      });
    }

    try {
      // Vérifier et décoder le token avec LA MÊME CONSTANTE
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log("✅ Token valide - Livreur ID:", decoded.id);

      // Récupérer le livreur depuis la base de données
      const livreur = await Livreur.findByPk(decoded.id, {
        attributes: { exclude: ["password"] },
      });

      if (!livreur) {
        console.log("❌ Livreur non trouvé en base");
        return res.status(401).json({
          success: false,
          message: "Livreur non trouvé.",
        });
      }

      // Vérifier si le compte est actif
      if (livreur.statut !== "actif") {
        console.log("❌ Compte livreur inactif:", livreur.statut);
        return res.status(401).json({
          success: false,
          message: `Votre compte est ${livreur.statut}. Contactez l'administration.`,
        });
      }

      // Ajouter le livreur à l'objet request
      req.livreur = livreur;
      console.log("✅ Livreur authentifié:", livreur.prenom, livreur.nom);
      next();
    } catch (jwtError) {
      console.log("❌ Erreur JWT:", jwtError.message);
      return res.status(401).json({
        success: false,
        message: "Token invalide ou expiré.",
      });
    }
  } catch (error) {
    console.error("💥 Erreur middleware livreur:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur d'authentification.",
    });
  }
};

module.exports = {
  protectLivreur,
};