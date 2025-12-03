const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Générer un token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Inscription Admin
const registerAdmin = async (req, res) => {
  try {
    const { firstName, email, password } = req.body;

    // Validation des champs requis
    if (!firstName || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Tous les champs sont obligatoires' 
      });
    }

    // Créer le nouvel admin
    const admin = await Admin.create({
      firstName,
      email,
      password
    });

    // Générer le token
    const token = generateToken(admin.id);

    res.status(201).json({
      success: true,
      message: 'Admin créé avec succès',
      token,
      admin: {
        id: admin.id,
        firstName: admin.firstName,
        email: admin.email,
        createdAt: admin.createdAt
      }
    });

  } catch (error) {
    console.error('Erreur inscription:', error);
    
    // Gestion des erreurs spécifiques à Sequelize
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Un admin avec cet email existe déjà'
      });
    }
    
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la création du compte admin',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Connexion Admin
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email et mot de passe requis' 
      });
    }

    // Trouver l'admin
    const admin = await Admin.findOne({ 
      where: { email } 
    });
    
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ 
        success: false,
        message: 'Email ou mot de passe incorrect' 
      });
    }

    // Mettre à jour la dernière connexion
    await admin.update({ lastLogin: new Date() });

    // Générer le token
    const token = generateToken(admin.id);

    res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      admin: {
        id: admin.id,
        firstName: admin.firstName,
        email: admin.email,
        lastLogin: admin.lastLogin
      }
    });

  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la connexion',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Récupérer les données de l'admin connecté
const getCurrentAdmin = async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.user.id, {
      attributes: ['id', 'firstName', 'email', 'lastLogin', 'createdAt']
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin non trouvé'
      });
    }

    res.json({
      success: true,
      admin: {
        id: admin.id,
        firstName: admin.firstName,
        email: admin.email,
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt
      }
    });

  } catch (error) {
    console.error('Erreur récupération admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

module.exports = {
  registerAdmin,
  loginAdmin,
  getCurrentAdmin
};