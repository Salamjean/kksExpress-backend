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

    destinataire_nom: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Nom du destinataire"
    },

    destinataire_contact: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: "Téléphone du destinataire"
    },

    destinataire_email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Email du destinataire"
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
        "acceptee",
        "recuperee",
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

    livreur_prenom: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    livreur_email: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    livreur_latitude: {
      type: DataTypes.DECIMAL(9, 6),
      allowNull: true,
      comment: "Position actuelle du livreur (mise à jour en temps réel)"
    },

    livreur_longitude: {
      type: DataTypes.DECIMAL(9, 6),
      allowNull: true,
      comment: "Position actuelle du livreur (mise à jour en temps réel)"
    },

    // Horodatage des changements de statut
    date_acceptation: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Date à laquelle le livreur a accepté la commande"
    },

    date_livraison: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Date de livraison effective"
    },

    date_annulation: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Date d'annulation si applicable"
    },

    date_recuperation: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Date à laquelle le livreur a récupéré le colis"
    },

    date_debut_livraison: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Date à laquelle le livreur a commencé la livraison vers le destinataire"
    },

    code_confirmation: {
      type: DataTypes.STRING(4),
      allowNull: true,
      comment: "Code OTP pour valider la livraison"
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
