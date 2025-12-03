const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const bcrypt = require("bcryptjs");

const Livreur = sequelize.define(
  "Livreur",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nom: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Le nom est requis",
        },
        len: {
          args: [2, 50],
          msg: "Le nom doit contenir entre 2 et 50 caractères",
        },
      },
    },
    prenom: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Le prénom est requis",
        },
        len: {
          args: [2, 50],
          msg: "Le prénom doit contenir entre 2 et 50 caractères",
        },
      },
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: {
        name: "email",
        msg: "Un livreur avec cet email existe déjà",
      },
      validate: {
        isEmail: {
          msg: "Veuillez entrer un email valide",
        },
        notEmpty: {
          msg: "L'email est requis",
        },
      },
    },

     latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      validate: {
        min: {
          args: [-90],
          msg: "La latitude doit être entre -90 et 90"
        },
        max: {
          args: [90],
          msg: "La latitude doit être entre -90 et 90"
        }
      }
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      validate: {
        min: {
          args: [-180],
          msg: "La longitude doit être entre -180 et 180"
        },
        max: {
          args: [180],
          msg: "La longitude doit être entre -180 et 180"
        }
      }
    },

    reset_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reset_token_expires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    telephone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Le numéro de téléphone est requis",
        },
      },
    },
    telephone_urgence: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Le numéro d'urgence est requis",
        },
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Le mot de passe est requis",
        },
        len: {
          args: [6, 255],
          msg: "Le mot de passe doit contenir au moins 6 caractères",
        },
      },
    },
    path_photo: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    adresse: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    date_naissance: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: {
          msg: "La date de naissance doit être une date valide",
        },
      },
    },
    numero_permis: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    type_vehicule: {
      type: DataTypes.ENUM("moto", "voiture", "camionnette", "velo"),
      allowNull: true,
    },
    plaque_immatriculation: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    statut: {
      type: DataTypes.ENUM("actif", "inactif", "en_conge", "suspendu"),
      defaultValue: "actif",
      allowNull: false,
    },
    date_embauche: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    // AJOUT: Champ manquant pour la méthode marquerConnecte()
    dernier_connection: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    is_online: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    localisation_actuelle: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    tableName: "livreurs",
    timestamps: true,
    hooks: {
      beforeCreate: async (livreur) => {
        if (livreur.password) {
          const salt = await bcrypt.genSalt(12);
          livreur.password = await bcrypt.hash(livreur.password, salt);
        }
      },
      beforeUpdate: async (livreur) => {
        if (livreur.changed("password")) {
          const salt = await bcrypt.genSalt(12);
          livreur.password = await bcrypt.hash(livreur.password, salt);
        }
      },
    },
  }
);

// Méthode pour comparer les mots de passe
Livreur.prototype.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour exclure le password des retours
Livreur.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

// Méthode pour marquer le livreur comme connecté
Livreur.prototype.marquerConnecte = function () {
  this.dernier_connection = new Date();
  this.is_online = true;
  return this.save();
};

// Méthode pour marquer le livreur comme déconnecté
Livreur.prototype.marquerDeconnecte = function () {
  this.is_online = false;
  return this.save();
};

// Méthode pour mettre à jour la localisation
Livreur.prototype.mettreAJourLocalisation = function (localisation) {
  this.localisation_actuelle = localisation;
  return this.save();
};

module.exports = Livreur;
