// controllers/adminController.js
const Commande = require('../models/Commande');
const Livreur = require('../models/Livreur');
const { Op, Sequelize } = require('sequelize');
const sequelize = require('../config/database');

// Fonction wrapper pour gérer les erreurs async
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// @desc    Récupérer les statistiques du dashboard admin
// @route   GET /api/admin/dashboard/stats
const getDashboardStats = asyncHandler(async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    // Compter les commandes par statut
    const commandesCount = await Commande.count();
    
    const commandesEnAttente = await Commande.count({
      where: { statut: 'en_attente' }
    });
    
    const commandesEnCours = await Commande.count({
      where: { statut: 'en_cours' }
    });
    
    const commandesLivrees = await Commande.count({
      where: { statut: 'livree' }
    });
    
    const commandesAnnulees = await Commande.count({
      where: { statut: 'annulee' }
    });

    // Compter les livreurs
    const livreursCount = await Livreur.count();
    
    const livreursActifs = await Livreur.count({
      where: { statut: 'actif' }
    });
    
    const livreursInactifs = await Livreur.count({
      where: { statut: 'inactif' }
    });
    
    const livreursEnLigne = await Livreur.count({
      where: { is_online: true }
    });

    // Calculer les revenus
    const revenuCeMois = await Commande.sum('tarif', {
      where: {
        statut: 'livree',
        createdAt: { [Op.gte]: thisMonth }
      }
    });

    const revenuDernierMois = await Commande.sum('tarif', {
      where: {
        statut: 'livree',
        createdAt: { 
          [Op.gte]: lastMonth,
          [Op.lt]: thisMonth
        }
      }
    });

    const revenuAujourdhui = await Commande.sum('tarif', {
      where: {
        statut: 'livree',
        createdAt: { [Op.gte]: today }
      }
    });

    // Commandes de la semaine
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const commandesCetteSemaine = await Commande.count({
      where: {
        createdAt: { [Op.gte]: startOfWeek }
      }
    });

    // Taux de livraison
    const tauxLivraison = commandesCount > 0 
      ? Math.round((commandesLivrees / commandesCount) * 100)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        commandes: {
          total: commandesCount,
          en_attente: commandesEnAttente,
          en_cours: commandesEnCours,
          livree: commandesLivrees,
          annulee: commandesAnnulees,
          cette_semaine: commandesCetteSemaine
        },
        livreurs: {
          total: livreursCount,
          actifs: livreursActifs,
          inactifs: livreursInactifs,
          en_ligne: livreursEnLigne,
          hors_ligne: livreursCount - livreursEnLigne
        },
        revenus: {
          aujourdhui: revenuAujourdhui || 0,
          ce_mois: revenuCeMois || 0,
          dernier_mois: revenuDernierMois || 0
        },
        performances: {
          taux_livraison: tauxLivraison,
          commandes_par_jour: commandesCount > 0 ? Math.round(commandesCount / 30) : 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
});

// @desc    Récupérer toutes les commandes (pour admin)
// @route   GET /api/admin/commandes
const getAllCommandes = asyncHandler(async (req, res) => {
  try {
    const { limit = 50, page = 1, statut, sort = 'desc' } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (statut) {
      whereClause.statut = statut;
    }

    const { count, rows: commandes } = await Commande.findAndCountAll({
      where: whereClause,
      order: [['createdAt', sort.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      commandes
    });

  } catch (error) {
    console.error('❌ Erreur récupération commandes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des commandes'
    });
  }
});

// @desc    Récupérer tous les livreurs (pour admin)
// @route   GET /api/admin/livreurs
const getAllLivreurs = asyncHandler(async (req, res) => {
  try {
    const { statut, is_online, limit = 50 } = req.query;

    const whereClause = {};
    if (statut) {
      whereClause.statut = statut;
    }
    if (is_online !== undefined) {
      whereClause.is_online = is_online === 'true';
    }

    const livreurs = await Livreur.findAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    // Pour chaque livreur, ajouter les stats
    const livreursWithStats = await Promise.all(
      livreurs.map(async (livreur) => {
        const stats = {
          total_commandes: await Commande.count({ where: { livreur_id: livreur.id } }),
          commandes_en_cours: await Commande.count({ 
            where: { 
              livreur_id: livreur.id,
              statut: 'en_cours'
            }
          }),
          commandes_livrees: await Commande.count({ 
            where: { 
              livreur_id: livreur.id,
              statut: 'livree'
            }
          })
        };

        return {
          ...livreur.toJSON(),
          stats
        };
      })
    );

    res.status(200).json({
      success: true,
      count: livreursWithStats.length,
      livreurs: livreursWithStats
    });

  } catch (error) {
    console.error('❌ Erreur récupération livreurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des livreurs'
    });
  }
});

// @desc    Récupérer les commandes récentes
// @route   GET /api/admin/commandes/recentes
const getRecentCommandes = asyncHandler(async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // On récupère les commandes AVEC les informations du livreur
    // Note: Assure-toi que les associations (Commande.belongsTo(Livreur)) sont bien définies dans tes modèles
    const commandes = await Commande.findAll({
      order: [['createdAt', 'DESC']],
      limit: limit,
      include: [
        {
          model: Livreur,
          as: 'livreur', // Enlève cette ligne si tu n'as pas défini d'alias 'as' dans ton modèle Commande
          attributes: ['id', 'nom', 'prenom', 'telephone'],
          required: false // LEFT JOIN : permet de retourner la commande même sans livreur
        }
      ]
    });

    res.status(200).json({
      success: true,
      count: commandes.length,
      commandes
    });

  } catch (error) {
    console.error('❌ Erreur récupération commandes récentes:', error);
    
    // Fallback de sécurité : Si l'include plante (problème d'association), on renvoie les commandes sans livreur
    try {
        const commandesSimple = await Commande.findAll({
            order: [['createdAt', 'DESC']],
            limit: limit
        });
        return res.status(200).json({
            success: true,
            count: commandesSimple.length,
            commandes: commandesSimple
        });
    } catch (e) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des commandes récentes'
        });
    }
  }
});

// @desc    Récupérer les commandes d'aujourd'hui
// @route   GET /api/admin/commandes/aujourdhui
const getTodayCommandes = asyncHandler(async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const commandes = await Commande.findAll({
      where: {
        createdAt: { [Op.gte]: today }
      },
      order: [['createdAt', 'DESC']]
    });

    // Statistiques des commandes d'aujourd'hui
    const stats = {
      total: commandes.length,
      en_attente: commandes.filter(c => c.statut === 'en_attente').length,
      en_cours: commandes.filter(c => c.statut === 'en_cours').length,
      livree: commandes.filter(c => c.statut === 'livree').length,
      revenus: commandes
        .filter(c => c.statut === 'livree')
        .reduce((sum, c) => sum + (parseFloat(c.tarif) || 0), 0)
    };

    res.status(200).json({
      success: true,
      stats,
      commandes
    });

  } catch (error) {
    console.error('❌ Erreur récupération commandes aujourd\'hui:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des commandes d\'aujourd\'hui'
    });
  }
});

// @desc    Récupérer les livreurs actifs avec leurs positions
// @route   GET /api/admin/livreurs/actifs
const getActiveLivreurs = asyncHandler(async (req, res) => {
  try {
    const livreurs = await Livreur.findAll({
      where: { 
        statut: 'actif',
        is_online: true
      },
      attributes: [
        'id', 'nom', 'prenom', 'email', 'telephone',
        'type_vehicule', 'is_online', 'dernier_connection',
        'latitude', 'longitude'
      ],
      order: [['dernier_connection', 'DESC']]
    });

    // Ajouter les stats pour chaque livreur
    const livreursWithStats = await Promise.all(
      livreurs.map(async (livreur) => {
        const commandesEnCours = await Commande.count({
          where: {
            livreur_id: livreur.id,
            statut: 'en_cours'
          }
        });

        // CORRECTION MAJEURE ICI : Conversion explicite en float pour éviter les crashs React
        const lat = livreur.latitude ? parseFloat(livreur.latitude) : null;
        const lng = livreur.longitude ? parseFloat(livreur.longitude) : null;

        return {
          ...livreur.toJSON(),
          latitude: lat,
          longitude: lng,
          commandes_en_cours: commandesEnCours
        };
      })
    );

    res.status(200).json({
      success: true,
      count: livreursWithStats.length,
      livreurs: livreursWithStats
    });

  } catch (error) {
    console.error('❌ Erreur récupération livreurs actifs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des livreurs actifs'
    });
  }
});

module.exports = {
  getDashboardStats,
  getAllCommandes,
  getAllLivreurs,
  getRecentCommandes,
  getTodayCommandes,
  getActiveLivreurs
};