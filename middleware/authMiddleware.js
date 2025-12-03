const jwt = require("jsonwebtoken");
const Admin = require('../models/Admin');

// Middleware pour vérifier l'authentification
const protect = async (req, res, next) => {
  console.log('🔐 === MIDDLEWARE PROTECT CALLED ===');
  console.log('📝 URL:', req.originalUrl);
  console.log('📝 Method:', req.method);
  console.log('🔑 Authorization Header:', req.headers.authorization);
  console.log('📦 Body:', req.body);
  console.log('🔍 Query:', req.query);
  
  try {
    // Récupérer le token du header Authorization
    let token;

    // Essayer plusieurs façons de récupérer le token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('✅ Token extrait depuis Bearer header');
    } 
    // Vérifier aussi dans les cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('✅ Token extrait depuis cookies');
    }
    // Vérifier dans les query params (pour debug)
    else if (req.query.token) {
      token = req.query.token;
      console.log('⚠️ Token extrait depuis query params (debug)');
    }

    // Log du token (partiellement masqué)
    if (token) {
      console.log('🔐 Token reçu (premiers 30 chars):', token.substring(0, 30) + '...');
      console.log('🔐 Longueur du token:', token.length);
    } else {
      console.log('❌ Aucun token trouvé');
    }

    // Vérifier si le token existe
    if (!token) {
      console.log('🚫 Accès refusé: Token manquant');
      return res.status(401).json({
        success: false,
        message: 'Accès non autorisé. Token manquant.',
        details: 'Veuillez vous connecter pour accéder à cette ressource.'
      });
    }

    try {
      // Vérifier et décoder le token
      console.log('🔍 Vérification du token avec secret:', process.env.JWT_SECRET ? 'Secret défini' : 'Secret NON défini!');
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token décodé avec succès');
      console.log('👤 ID utilisateur:', decoded.id);
      console.log('📧 Email:', decoded.email);
      console.log('⏰ Expiration:', new Date(decoded.exp * 1000).toISOString());
      
      // Récupérer l'admin depuis la base de données
      const admin = await Admin.findByPk(decoded.id, {
        attributes: ['id', 'firstName', 'email', 'role', 'isActive', 'lastLogin']
      });

      if (!admin) {
        console.log('❌ Admin non trouvé dans la base pour ID:', decoded.id);
        return res.status(401).json({
          success: false,
          message: 'Admin non trouvé.',
          details: 'L\'utilisateur associé à ce token n\'existe pas.'
        });
      }

      // Vérifier si le compte est actif
      if (admin.isActive === false) {
        console.log('❌ Compte admin désactivé:', admin.email);
        return res.status(401).json({
          success: false,
          message: 'Compte administrateur désactivé.',
          details: 'Veuillez contacter un administrateur.'
        });
      }

      // Ajouter l'admin à l'objet request
      req.admin = admin;
      console.log('✅ Authentification réussie pour:', admin.email);
      console.log('✅ Rôle:', admin.role);
      console.log('✅ Nom:', admin.firstName);
      next();

    } catch (jwtError) {
      console.error('❌ ERREUR JWT:', jwtError.name);
      console.error('❌ Message:', jwtError.message);
      console.error('❌ Stack:', jwtError.stack);
      
      // Messages d'erreur plus précis
      let message = 'Token invalide ou expiré.';
      let details = '';
      
      if (jwtError.name === 'TokenExpiredError') {
        message = 'Token expiré.';
        details = 'Votre session a expiré. Veuillez vous reconnecter.';
        console.log('⏰ Token expiré à:', new Date(jwtError.expiredAt).toISOString());
      } else if (jwtError.name === 'JsonWebTokenError') {
        message = 'Token invalide.';
        details = jwtError.message;
      } else if (jwtError.name === 'NotBeforeError') {
        message = 'Token pas encore valide.';
        details = jwtError.message;
      }
      
      return res.status(401).json({
        success: false,
        message: message,
        details: details,
        error: process.env.NODE_ENV === 'development' ? jwtError.message : undefined
      });
    }

  } catch (error) {
    console.error('💥 ERREUR GÉNÉRALE middleware auth:', error);
    console.error('💥 Stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Erreur d\'authentification.',
      details: 'Une erreur interne est survenue.'
    });
  }
};

module.exports = { protect };