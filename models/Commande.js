// models/Commande.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Commande = sequelize.define(
  "Commande",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // Référence
    reference: {
      type: DataTypes.STRING(15),
      unique: true,
    },

    // Utilisateur
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // Expéditeur
    user_nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    user_prenom: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    user_telephone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },

    user_email: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    expediteur_contact_alt: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: "Contact si expéditeur ≠ utilisateur",
    },

    expediteur_latitude: {
      type: DataTypes.DECIMAL(9, 6),
      allowNull: true,
    },

    expediteur_longitude: {
      type: DataTypes.DECIMAL(9, 6),
      allowNull: true,
    },

    expediteur_adresse: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Destinataire (juste position GPS)
    destinataire_latitude: {
      type: DataTypes.DECIMAL(9, 6),
      allowNull: false,
    },

    destinataire_longitude: {
      type: DataTypes.DECIMAL(9, 6),
      allowNull: false,
    },
    destinataire_adresse: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    // Colis
    type_colis: {
      type: DataTypes.ENUM("Documents", "Nourritures", "Appareils", "Autres"),
      defaultValue: "Appareils",
    },

    libelle_colis: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    nature_colis: {
      type: DataTypes.ENUM("standard", "fragile", "perissable"),
      defaultValue: "standard",
    },

    description_colis: {
      type: DataTypes.TEXT,
    },

    // Statut
    statut: {
      type: DataTypes.ENUM(
        "en_attente",
        "confirmee",
        "en_cours",
        "livree",
        "annulee"
      ),
      defaultValue: "en_attente",
    },

    // Tarif
    tarif: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 100,
    },

    // Assignation à un livreur
    livreur_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "livreurs",
        key: "id",
      },
    },

    livreur_nom: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    livreur_telephone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: "commandes",
    timestamps: true,
  }
);

module.exports = Commande;
