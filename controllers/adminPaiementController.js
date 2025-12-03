// controllers/adminPaiementController.js
const Paiement = require('../models/Paiement');
const Livreur = require('../models/Livreur');
const { Op } = require('sequelize');

// Fonction wrapper pour gérer les erreurs async
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// @desc    Récupérer tous les paiements
// @route   GET /api/admin/paiements
const getAllPaiements = asyncHandler(async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      livreur_id, 
      date_debut, 
      date_fin,
      statut_paiement,
      mode_paiement,
      search 
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    const whereClause = {};
    
    // Filtres
    if (livreur_id) {
      whereClause.livreur_id = livreur_id;
    }
    
    if (statut_paiement) {
      whereClause.statut_paiement = statut_paiement;
    }
    
    if (mode_paiement) {
      whereClause.mode_paiement = mode_paiement;
    }
    
    // Filtre par date
    if (date_debut && date_fin) {
      whereClause.date_paiement = {
        [Op.between]: [date_debut, date_fin]
      };
    } else if (date_debut) {
      whereClause.date_paiement = { [Op.gte]: date_debut };
    } else if (date_fin) {
      whereClause.date_paiement = { [Op.lte]: date_fin };
    }
    
    // Recherche
    if (search) {
      whereClause[Op.or] = [
        { reference: { [Op.like]: `%${search}%` } },
        { livreur_nom: { [Op.like]: `%${search}%` } },
        { livreur_prenom: { [Op.like]: `%${search}%` } },
        { numero_utilise: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const { count, rows: paiements } = await Paiement.findAndCountAll({
      where: whereClause,
      order: [['date_paiement', 'DESC'], ['heure_paiement', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: Livreur,
          as: 'livreur',
          attributes: ['id', 'nom', 'prenom', 'telephone', 'type_vehicule']
        }
      ]
    });
    
    // Calculer les totaux
    const paiementsComplets = paiements.filter(p => p.statut_paiement === 'complet');
    const totalVerse = paiementsComplets.reduce((sum, p) => sum + parseFloat(p.montant_verse), 0);
    
    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totals: {
        totalVerse,
        nombrePaiements: count,
        paiementsComplets: paiementsComplets.length
      },
      paiements: paiements.map(p => p.toJSON())
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération paiements:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des paiements'
    });
  }
});

// @desc    Récupérer les paiements d'un livreur spécifique
// @route   GET /api/admin/paiements/livreur/:livreurId
const getPaiementsByLivreur = asyncHandler(async (req, res) => {
  try {
    const { livreurId } = req.params;
    const { date_debut, date_fin, limit = 50 } = req.query;
    
    const livreur = await Livreur.findByPk(livreurId);
    
    if (!livreur) {
      return res.status(404).json({
        success: false,
        message: 'Livreur non trouvé'
      });
    }
    
    const whereClause = { livreur_id: livreurId };
    
    // Filtre par date
    if (date_debut && date_fin) {
      whereClause.date_paiement = {
        [Op.between]: [date_debut, date_fin]
      };
    }
    
    const paiements = await Paiement.findAll({
      where: whereClause,
      order: [['date_paiement', 'DESC'], ['heure_paiement', 'DESC']],
      limit: parseInt(limit)
    });
    
    // Calculer les soldes actuels
    const montantDuAujourdhui = await Paiement.getMontantDuAujourdhui(livreurId);
    const historique = await Paiement.getHistoriquePaiements(livreurId);
    const retardAccumule = await Paiement.calculerRetardAccumule(livreurId);
    
    // Statistiques
    const paiementsComplets = paiements.filter(p => p.statut_paiement === 'complet');
    const totalVerse = paiementsComplets.reduce((sum, p) => sum + parseFloat(p.montant_verse), 0);
    
    res.status(200).json({
      success: true,
      livreur: {
        id: livreur.id,
        nom: livreur.nom,
        prenom: livreur.prenom,
        telephone: livreur.telephone,
        type_vehicule: livreur.type_vehicule,
        statut: livreur.statut
      },
      soldes: {
        ...montantDuAujourdhui,
        retard_accumule: retardAccumule
      },
      historique: historique,
      paiements: paiements.map(p => p.toJSON()),
      statistiques: {
        totalPaiements: paiements.length,
        paiementsComplets: paiementsComplets.length,
        totalVerse,
        derniereMiseAJour: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération paiements livreur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des paiements du livreur'
    });
  }
});

// @desc    Récupérer les soldes de tous les livreurs
// @route   GET /api/admin/paiements/soldes
const getSoldesLivreurs = asyncHandler(async (req, res) => {
  try {
    const livreurs = await Livreur.findAll({
      where: { statut: 'actif' },
      attributes: ['id', 'nom', 'prenom', 'telephone', 'type_vehicule', 'statut']
    });
    
    const livreursAvecSoldes = await Promise.all(
      livreurs.map(async (livreur) => {
        try {
          const montantDu = await Paiement.getMontantDuAujourdhui(livreur.id);
          const retard = await Paiement.calculerRetardAccumule(livreur.id);
          
          return {
            id: livreur.id,
            nom: livreur.nom,
            prenom: livreur.prenom,
            telephone: livreur.telephone,
            type_vehicule: livreur.type_vehicule,
            statut: livreur.statut,
            soldes: {
              montant_du_jour: 7000,
              retard_accumule: retard,
              total_a_payer: 7000 + retard,
              deja_paye_aujourdhui: montantDu.deja_paye_aujourdhui || 0,
              reste_a_payer: montantDu.reste_a_payer || 7000 + retard,
              statut_jour: montantDu.statut_jour_aujourdhui || 'partiel'
            }
          };
        } catch (error) {
          console.error(`Erreur calcul soldes livreur ${livreur.id}:`, error);
          return {
            id: livreur.id,
            nom: livreur.nom,
            prenom: livreur.prenom,
            telephone: livreur.telephone,
            type_vehicule: livreur.type_vehicule,
            statut: livreur.statut,
            soldes: {
              montant_du_jour: 7000,
              retard_accumule: 0,
              total_a_payer: 7000,
              deja_paye_aujourdhui: 0,
              reste_a_payer: 7000,
              statut_jour: 'partiel'
            },
            error: 'Erreur calcul soldes'
          };
        }
      })
    );
    
    // Calculer les totaux globaux
    const totalLivreurs = livreursAvecSoldes.length;
    const totalRetard = livreursAvecSoldes.reduce((sum, l) => sum + l.soldes.retard_accumule, 0);
    const totalAPayer = livreursAvecSoldes.reduce((sum, l) => sum + l.soldes.total_a_payer, 0);
    const totalDejaPaye = livreursAvecSoldes.reduce((sum, l) => sum + l.soldes.deja_paye_aujourdhui, 0);
    const totalResteAPayer = livreursAvecSoldes.reduce((sum, l) => sum + l.soldes.reste_a_payer, 0);
    
    const livreursAvecRetard = livreursAvecSoldes.filter(l => l.soldes.retard_accumule > 0);
    const livreursSoldes = livreursAvecSoldes.filter(l => l.soldes.statut_jour === 'complet');
    
    res.status(200).json({
      success: true,
      totals: {
        totalLivreurs,
        totalRetard,
        totalAPayer,
        totalDejaPaye,
        totalResteAPayer,
        livreursAvecRetard: livreursAvecRetard.length,
        livreursSoldes: livreursSoldes.length
      },
      livreurs: livreursAvecSoldes.sort((a, b) => {
        // Trier par retard décroissant, puis par nom
        if (b.soldes.retard_accumule !== a.soldes.retard_accumule) {
          return b.soldes.retard_accumule - a.soldes.retard_accumule;
        }
        return a.nom.localeCompare(b.nom);
      })
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération soldes livreurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des soldes'
    });
  }
});

// @desc    Créer un paiement pour un livreur
// @route   POST /api/admin/paiements
const createPaiement = asyncHandler(async (req, res) => {
  try {
    const { 
      livreur_id, 
      montant_verse, 
      mode_paiement, 
      numero_utilise, 
      description 
    } = req.body;
    
    // Validation
    if (!livreur_id || !montant_verse || !mode_paiement) {
      return res.status(400).json({
        success: false,
        message: 'Livreur ID, montant et mode de paiement sont obligatoires'
      });
    }
    
    // Vérifier le livreur
    const livreur = await Livreur.findByPk(livreur_id);
    if (!livreur) {
      return res.status(404).json({
        success: false,
        message: 'Livreur non trouvé'
      });
    }
    
    let paiement;
    
    if (mode_paiement === 'especes') {
      // Paiement en espèces
      paiement = await Paiement.creerPaiementEspeces({
        livreur_id,
        livreur_nom: livreur.nom,
        livreur_prenom: livreur.prenom,
        livreur_telephone: livreur.telephone,
        montant_verse: parseFloat(montant_verse),
        mode_paiement: 'especes',
        description: description || 'Paiement en espèces effectué par l\'admin'
      });
    } else {
      // Paiement mobile money
      if (!numero_utilise) {
        return res.status(400).json({
          success: false,
          message: 'Numéro de téléphone requis pour les paiements mobile money'
        });
      }
      
      const result = await Paiement.initialiserPaiementMobile({
        livreur_id,
        livreur_nom: livreur.nom,
        livreur_prenom: livreur.prenom,
        livreur_telephone: livreur.telephone,
        montant_verse: parseFloat(montant_verse),
        mode_paiement: mode_paiement,
        numero_utilise: numero_utilise,
        description: description || `Paiement ${mode_paiement} initié par l'admin`
      });
      
      paiement = result.paiement;
      
      // Simuler la confirmation pour l'admin (en réalité, ce serait fait par le système de paiement)
      await Paiement.confirmerPaiementMobile(result.transaction_id, {
        mode_paiement: mode_paiement,
        cel_phone_num: numero_utilise
      });
    }
    
    // Récupérer le paiement mis à jour
    const paiementComplet = await Paiement.findByPk(paiement.id, {
      include: [
        {
          model: Livreur,
          as: 'livreur',
          attributes: ['id', 'nom', 'prenom', 'telephone']
        }
      ]
    });
    
    // Mettre à jour les statuts
    await Paiement.mettreAJourStatutsJours(livreur_id);
    
    res.status(201).json({
      success: true,
      message: 'Paiement créé avec succès',
      paiement: paiementComplet.toJSON()
    });
    
  } catch (error) {
    console.error('❌ Erreur création paiement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du paiement',
      error: error.message
    });
  }
});

// @desc    Mettre à jour un paiement
// @route   PUT /api/admin/paiements/:id
const updatePaiement = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const paiement = await Paiement.findByPk(id);
    
    if (!paiement) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }
    
    // Champs autorisés à modifier
    const allowedUpdates = ['statut_paiement', 'description', 'numero_utilise'];
    const updateData = {};
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });
    
    await paiement.update(updateData);
    
    // Mettre à jour les statuts si le statut a changé
    if (updates.statut_paiement) {
      await Paiement.mettreAJourStatutsJours(paiement.livreur_id);
    }
    
    const paiementUpdated = await Paiement.findByPk(id, {
      include: [
        {
          model: Livreur,
          as: 'livreur',
          attributes: ['id', 'nom', 'prenom', 'telephone']
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      message: 'Paiement mis à jour avec succès',
      paiement: paiementUpdated.toJSON()
    });
    
  } catch (error) {
    console.error('❌ Erreur mise à jour paiement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du paiement'
    });
  }
});

// @desc    Supprimer un paiement
// @route   DELETE /api/admin/paiements/:id
const deletePaiement = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    const paiement = await Paiement.findByPk(id);
    
    if (!paiement) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }
    
    const livreurId = paiement.livreur_id;
    await paiement.destroy();
    
    // Mettre à jour les statuts
    await Paiement.mettreAJourStatutsJours(livreurId);
    
    res.status(200).json({
      success: true,
      message: 'Paiement supprimé avec succès'
    });
    
  } catch (error) {
    console.error('❌ Erreur suppression paiement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du paiement'
    });
  }
});

// @desc    Forcer la mise à jour des statuts d'un livreur
// @route   POST /api/admin/paiements/:livreurId/recalculer
const recalculerStatuts = asyncHandler(async (req, res) => {
  try {
    const { livreurId } = req.params;
    
    const livreur = await Livreur.findByPk(livreurId);
    if (!livreur) {
      return res.status(404).json({
        success: false,
        message: 'Livreur non trouvé'
      });
    }
    
    await Paiement.mettreAJourStatutsJours(livreurId);
    
    const montantDu = await Paiement.getMontantDuAujourdhui(livreurId);
    
    res.status(200).json({
      success: true,
      message: 'Statuts recalculés avec succès',
      soldes: montantDu
    });
    
  } catch (error) {
    console.error('❌ Erreur recalcul statuts:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du recalcul des statuts'
    });
  }
});

// @desc    Récupérer les statistiques des paiements
// @route   GET /api/admin/paiements/stats
const getPaiementStats = asyncHandler(async (req, res) => {
  try {
    const { date_debut, date_fin } = req.query;
    
    const today = new Date().toISOString().split('T')[0];
    const whereClause = {};
    
    if (date_debut && date_fin) {
      whereClause.date_paiement = {
        [Op.between]: [date_debut, date_fin]
      };
    } else {
      // Par défaut, ce mois
      const firstDay = new Date();
      firstDay.setDate(1);
      whereClause.date_paiement = {
        [Op.gte]: firstDay.toISOString().split('T')[0]
      };
    }
    
    // Total des paiements
    const totalPaiements = await Paiement.count({ where: whereClause });
    
    // Paiements complets
    const paiementsComplets = await Paiement.findAll({
      where: {
        ...whereClause,
        statut_paiement: 'complet'
      }
    });
    
    const totalVerse = paiementsComplets.reduce((sum, p) => sum + parseFloat(p.montant_verse), 0);
    
    // Par mode de paiement
    const paiementsParMode = await Paiement.findAll({
      where: whereClause,
      attributes: [
        'mode_paiement',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('montant_verse')), 'total']
      ],
      group: ['mode_paiement'],
      raw: true
    });
    
    // Paiements d'aujourd'hui
    const paiementsAujourdhui = await Paiement.count({
      where: {
        date_paiement: today,
        statut_paiement: 'complet'
      }
    });
    
    const totalAujourdhui = await Paiement.sum('montant_verse', {
      where: {
        date_paiement: today,
        statut_paiement: 'complet'
      }
    }) || 0;
    
    res.status(200).json({
      success: true,
      stats: {
        totalPaiements,
        paiementsComplets: paiementsComplets.length,
        totalVerse,
        paiementsAujourdhui,
        totalAujourdhui,
        paiementsParMode: paiementsParMode.map(p => ({
          mode: p.mode_paiement,
          count: parseInt(p.count),
          total: parseFloat(p.total) || 0
        })),
        moyenneParJour: totalVerse / (paiementsComplets.length > 0 ? paiementsComplets.length : 1)
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération stats paiements:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
});

module.exports = {
  getAllPaiements,
  getPaiementsByLivreur,
  getSoldesLivreurs,
  createPaiement,
  updatePaiement,
  deletePaiement,
  recalculerStatuts,
  getPaiementStats
};