const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const Admin = sequelize.define('Admin', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Le prénom est requis'
      },
      len: {
        args: [2, 50],
        msg: 'Le prénom doit contenir entre 2 et 50 caractères'
      }
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: {
      name: 'email',
      msg: 'Un admin avec cet email existe déjà'
    },
    validate: {
      isEmail: {
        msg: 'Veuillez entrer un email valide'
      },
      notEmpty: {
        msg: 'L\'email est requis'
      }
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Le mot de passe est requis'
      },
      len: {
        args: [6, 255],
        msg: 'Le mot de passe doit contenir au moins 6 caractères'
      }
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'admins',
  timestamps: true,
  hooks: {
    beforeCreate: async (admin) => {
      if (admin.password) {
        const salt = await bcrypt.genSalt(12);
        admin.password = await bcrypt.hash(admin.password, salt);
      }
    },
    beforeUpdate: async (admin) => {
      if (admin.changed('password')) {
        const salt = await bcrypt.genSalt(12);
        admin.password = await bcrypt.hash(admin.password, salt);
      }
    }
  }
});

// Méthode d'instance pour comparer les mots de passe
Admin.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour exclure le password des retours
Admin.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

module.exports = Admin;