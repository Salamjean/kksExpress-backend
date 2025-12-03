// middleware/adminMiddleware.js
const jwt = require("jsonwebtoken");

const protectAdmin = async (req, res, next) => {
  console.log(`🔐 === MIDDLEWARE ADMIN PROTECT === ${req.method} ${req.path}`);
  
  try {
    // Récupérer le token
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('✅ Token extrait du header Authorization');
    }

    if (!token) {
      console.log('❌ Aucun token trouvé');
      return res.status(401).json({
        success: false,
        message: 'Accès non autorisé. Token manquant.'
      });
    }

    console.log('🔐 Token présent, longueur:', token.length);

    try {
      // Vérifier le token
      console.log('🔍 Vérification du token...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token valide');
      console.log('👤 Admin ID:', decoded.id);
      console.log('📧 Email:', decoded.email);
      
      // IMPORTANT: Si vous n'avez qu'un type d'admin, 
      // vérifiez juste que c'est bien un admin via l'ID ou email
      // Vous pouvez vérifier dans la base si nécessaire
      
      // Ajouter les infos admin à la requête
      req.admin = {
        id: decoded.id,
        email: decoded.email,
        firstName: decoded.firstName || 'Admin'
      };
      
      console.log('✅ Middleware admin passé avec succès');
      next();

    } catch (jwtError) {
      console.error('❌ ERREUR JWT:', jwtError.name);
      console.error('❌ Message:', jwtError.message);
      
      let message = 'Token invalide.';
      if (jwtError.name === 'TokenExpiredError') {
        message = 'Token expiré. Veuillez vous reconnecter.';
      }
      
      return res.status(401).json({
        success: false,
        message: message
      });
    }

  } catch (error) {
    console.error('💥 ERREUR GÉNÉRALE middleware admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur d\'authentification.'
    });
  }
};

module.exports = { protectAdmin };