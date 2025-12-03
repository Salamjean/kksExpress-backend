const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const bcrypt = require("bcryptjs");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nom: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    prenom: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    telephone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    adresse: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    ville: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    statut: {
      type: DataTypes.ENUM("actif", "inactif"),
      allowNull: false,
      defaultValue: "actif",
    },
    email_verifie: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    reset_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    reset_token_expires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    dernier_login: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Coordonnées GPS (pour géolocalisation)
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    },

    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
    },

    genre: {
      type: DataTypes.ENUM("homme", "femme"),
      allowNull: true,
    },

    photo_profil: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    // Pour OTP (One-Time Password)
    otp_code: {
      type: DataTypes.STRING(6),
      allowNull: true,
    },

    otp_expires: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    otp_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    otp_locked_until: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Ajoutez ces champs après le dernier champ existant :
    demande_suppression: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    
    date_demande_suppression: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    
    compte_supprime: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    
    date_suppression_effective: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  }
);

// Méthode pour comparer les mots de passe
User.prototype.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour marquer la connexion
User.prototype.marquerConnecte = async function () {
  this.dernier_login = new Date();
  await this.save();
};

// Ajoutez cette méthode au modèle User :
User.prototype.peutSeConnecter = function() {
  // Vérifie si le compte est marqué pour suppression depuis plus de 30 jours
  if (this.demande_suppression && this.date_demande_suppression) {
    const trenteJours = 30 * 24 * 60 * 60 * 1000; // 30 jours en millisecondes
    const maintenant = new Date();
    
    // Si la demande a plus de 30 jours
    if (maintenant - this.date_demande_suppression > trenteJours) {
      return false;
    }
  }
  
  // Vérifie si le compte est complètement supprimé
  if (this.compte_supprime) {
    return false;
  }
  
  return this.statut === "actif";
};

// Optionnel: Ajoutez une méthode pour annuler la suppression
User.prototype.annulerSuppression = async function() {
  this.demande_suppression = false;
  this.date_demande_suppression = null;
  await this.save();
};

module.exports = User;
