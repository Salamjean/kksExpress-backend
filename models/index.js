// models/index.js
const User = require('./User');
const Livreur = require('./Livreur');
const Commande = require('./Commande');

// ============================================
// DÉFINITION DES RELATIONS (TOUT ICI)
// ============================================

// 1. User - Commande
User.hasMany(Commande, {
  foreignKey: 'user_id',
  as: 'commandes'
});

Commande.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// 2. Livreur - Commande
Livreur.hasMany(Commande, {
  foreignKey: 'livreur_id',
  as: 'livraisons'  // Alias différent pour éviter le conflit
});

Commande.belongsTo(Livreur, {
  foreignKey: 'livreur_id',
  as: 'livreur'
});

module.exports = {
  User,
  Livreur,
  Commande
};