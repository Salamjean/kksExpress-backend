const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    // AJOUTEZ CES OPTIONS
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true
    }
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connecté à la base de données MySQL');

    // MODIFIEZ CETTE LIGNE : Enlevez { alter: true }
    // await sequelize.sync({ alter: true }); // ← À SUPPRIMER

    // UTILISEZ À LA PLACE :
    // Option 1: Pas de sync() du tout (recommandé pour production)
    // console.log('✅ Base de données connectée');
    // return;

    // Option 2: sync() sans alter
    await sequelize.sync();
    console.log('✅ Modèles synchronisés (sans alter)');

    // Option 3: sync() conditionnel
    // if (process.env.NODE_ENV === 'development') {
    //   await sequelize.sync();
    //   console.log('✅ Modèles synchronisés (développement)');
    // } else {
    //   console.log('✅ Base de données connectée (production - pas de sync)');
    // }
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error.message);

    // Affichez plus de détails pour le débogage
    if (error.message.includes('Trop de clefs')) {
      console.error('\n⚠️  ERREUR: Trop d\'index dans la table MySQL');
      console.error('Solution: ');
      console.error('1. Supprimez les index inutiles avec: SHOW INDEX FROM users;');
      console.error('2. Utilisez seulement sequelize.authenticate() sans sync()');
      console.error('3. Pour les changements, utilisez des migrations manuelles');
    }

    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };