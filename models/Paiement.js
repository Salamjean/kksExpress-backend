const { DataTypes, Op } = require("sequelize");
const { sequelize } = require("../config/database");

const Paiement = sequelize.define(
  "Paiement",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    reference: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: false,
    },
    livreur_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    livreur_nom: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    livreur_prenom: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    livreur_telephone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    montant_verse: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    montant_du_jour: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 7000,
    },
    reste_a_verser: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    date_paiement: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    heure_paiement: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    mode_paiement: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    numero_utilise: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // STATUT DU PAIEMENT INDIVIDUEL
    statut_paiement: {
      type: DataTypes.ENUM('en_attente', 'complet', 'echoue', 'annule', 'partiel'),
      defaultValue: 'en_attente',
      allowNull: false,
    },
    // STATUT DE LA JOURNÉE (calculé)
    statut_jour: {
      type: DataTypes.ENUM('complet', 'partiel', 'en_retard'),
      defaultValue: 'partiel',
      allowNull: false,
    },
    retard_accumule: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "paiements",
    timestamps: true,
  }
);

// ========== MÉTHODES DE CALCUL ==========

// Méthode pour calculer les soldes d'une journée
Paiement.calculerSoldesJour = async function(livreurId, date = null) {
  const jour = date || new Date().toISOString().split('T')[0];
  const dateJour = new Date(jour);
  const aujourdhui = new Date();
  
  // Récupérer TOUS les paiements du livreur pour cette date
  const paiements = await this.findAll({
    where: {
      livreur_id: livreurId,
      date_paiement: jour
    }
  });
  
  // Calculer le total versé (UNIQUEMENT les paiements COMPLETS)
  const paiementsComplets = paiements.filter(p => p.statut_paiement === 'complet');
  const totalVerse = paiementsComplets.reduce((sum, p) => sum + parseFloat(p.montant_verse), 0);
  
  // Montant du jour (fixe 7000)
  const montantDuJour = 7000;
  
  // Calculer le reste à verser
  const resteAVerser = Math.max(0, montantDuJour - totalVerse);
  
  // Déterminer le statut de la journée
  let statutJour = 'partiel';
  
  if (resteAVerser <= 0) {
    statutJour = 'complet';
  } else if (dateJour < new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate())) {
    // Si la date est strictement dans le passé (hier ou avant)
    statutJour = 'en_retard';
  }
  
  return {
    date: jour,
    montant_du_jour: montantDuJour,
    total_verse: totalVerse,
    reste_a_verser: resteAVerser,
    statut_jour: statutJour,
    nombre_paiements: paiements.length,
    paiements_complets: paiementsComplets.length
  };
};

// Méthode pour calculer le retard accumulé
Paiement.calculerRetardAccumule = async function(livreurId) {
  const aujourdhui = new Date().toISOString().split('T')[0];
  
  // Récupérer toutes les dates distinctes avant aujourd'hui
  const datesPassees = await this.findAll({
    attributes: ['date_paiement'],
    where: {
      livreur_id: livreurId,
      date_paiement: { [Op.lt]: aujourdhui }
    },
    group: ['date_paiement'],
    raw: true
  });
  
  let retardTotal = 0;
  
  // Pour chaque jour passé, calculer si c'est en retard
  for (const row of datesPassees) {
    const date = row.date_paiement;
    const soldesJour = await this.calculerSoldesJour(livreurId, date);
    
    // Si le jour n'est pas complet, ajouter au retard
    if (soldesJour.statut_jour === 'en_retard') {
      retardTotal += soldesJour.reste_a_verser;
    }
  }
  
  return retardTotal;
};

// Méthode pour obtenir le montant dû aujourd'hui
Paiement.getMontantDuAujourdhui = async function(livreurId) {
  const aujourdhui = new Date().toISOString().split('T')[0];
  
  // Soldes d'aujourd'hui
  const soldesAujourdhui = await this.calculerSoldesJour(livreurId, aujourdhui);
  
  // Retard accumulé
  const retard = await this.calculerRetardAccumule(livreurId);
  
  // Montant total dû
  const totalDu = 7000 + retard;
  
  // Ce qui a déjà été payé aujourd'hui (uniquement les paiements complets)
  const paiementsAujourdhui = await this.findAll({
    where: {
      livreur_id: livreurId,
      date_paiement: aujourdhui,
      statut_paiement: 'complet'
    }
  });
  
  const dejaPayeAujourdhui = paiementsAujourdhui.reduce((sum, p) => sum + parseFloat(p.montant_verse), 0);
  
  // Reste à payer
  const resteAPayer = Math.max(0, totalDu - dejaPayeAujourdhui);
  
  return {
    montant_du_jour: 7000,
    retard_accumule: retard,
    total_a_payer: totalDu,
    deja_paye_aujourdhui: dejaPayeAujourdhui,
    reste_a_payer: resteAPayer,
    statut_jour_aujourdhui: soldesAujourdhui.statut_jour,
    soldes_aujourdhui: soldesAujourdhui
  };
};

// Méthode pour mettre à jour les statuts de tous les jours
Paiement.mettreAJourStatutsJours = async function(livreurId) {
  // Récupérer toutes les dates distinctes
  const datesPaiements = await this.findAll({
    where: { livreur_id: livreurId },
    attributes: ['date_paiement'],
    group: ['date_paiement'],
    raw: true
  });
  
  // Mettre à jour chaque jour
  for (const row of datesPaiements) {
    const date = row.date_paiement;
    const soldesJour = await this.calculerSoldesJour(livreurId, date);
    
    // Mettre à jour le statut_jour pour tous les paiements de cette date
    await this.update(
      {
        statut_jour: soldesJour.statut_jour,
        reste_a_verser: soldesJour.reste_a_verser
      },
      {
        where: {
          livreur_id: livreurId,
          date_paiement: date
        }
      }
    );
  }
  
  // Mettre à jour le retard accumulé pour tous les paiements
  const retard = await this.calculerRetardAccumule(livreurId);
  await this.update(
    { retard_accumule: retard },
    { where: { livreur_id: livreurId } }
  );
  
  return true;
};

// ========== MÉTHODES DE PAIEMENT ==========

// Initialiser un paiement mobile
Paiement.initialiserPaiementMobile = async function(paiementData) {
  // Générer une référence unique
  const genererReference = () => {
    const date = new Date();
    const timestamp = date.getTime();
    const random = Math.floor(1000 + Math.random() * 9000);
    const livreurCode = paiementData.livreur_id.toString().padStart(4, "0");
    return `CP${livreurCode}${timestamp.toString().slice(-8)}${random}`;
  };

  const reference = genererReference();
  
  // Calculer le reste à verser pour aujourd'hui
  const montantDu = await this.getMontantDuAujourdhui(paiementData.livreur_id);
  const resteAPayer = montantDu.reste_a_payer;
  
  // Créer le paiement
  const paiement = await this.create({
    reference: reference,
    ...paiementData,
    statut_paiement: 'en_attente',
    statut_jour: 'partiel',
    date_paiement: new Date().toISOString().split('T')[0],
    heure_paiement: new Date().toTimeString().split(' ')[0],
    reste_a_verser: resteAPayer - parseFloat(paiementData.montant_verse),
    retard_accumule: montantDu.retard_accumule || 0
  });

  return {
    success: true,
    paiement: paiement,
    transaction_id: reference
  };
};

// Confirmer un paiement mobile
Paiement.confirmerPaiementMobile = async function(transactionId, details) {
  try {
    const paiement = await this.findOne({
      where: { reference: transactionId }
    });

    if (!paiement) {
      throw new Error('Transaction non trouvée');
    }

    // Mettre à jour le statut du paiement
    await paiement.update({
      statut_paiement: 'complet',
      description: `Paiement ${details.mode_paiement || paiement.mode_paiement} confirmé`,
      numero_utilise: details.cel_phone_num || paiement.numero_utilise
    });

    // Mettre à jour les statuts des jours
    await this.mettreAJourStatutsJours(paiement.livreur_id);

    return paiement;
  } catch (error) {
    console.error('Erreur confirmation paiement:', error);
    throw error;
  }
};

// Marquer un paiement comme échoué
Paiement.marquerPaiementEchoue = async function(transactionId, raison) {
  try {
    const paiement = await this.findOne({
      where: { reference: transactionId }
    });

    if (!paiement) {
      throw new Error('Transaction non trouvée');
    }

    await paiement.update({
      statut_paiement: 'echoue',
      description: `Échec: ${raison}`
    });

    return paiement;
  } catch (error) {
    console.error('Erreur marquage échec:', error);
    throw error;
  }
};

// Créer un paiement en espèces
Paiement.creerPaiementEspeces = async function(paiementData) {
  try {
    const genererReference = () => {
      const date = new Date();
      const timestamp = date.getTime();
      const random = Math.floor(1000 + Math.random() * 9000);
      const livreurCode = paiementData.livreur_id.toString().padStart(4, "0");
      return `ES${livreurCode}${timestamp.toString().slice(-8)}${random}`;
    };

    const reference = genererReference();
    
    // Calculer le reste à verser
    const montantDu = await this.getMontantDuAujourdhui(paiementData.livreur_id);
    const resteAPayer = montantDu.reste_a_payer;
    const montantVerse = parseFloat(paiementData.montant_verse);
    
    // Déterminer le statut du paiement
    let statutPaiement = 'partiel';
    if (montantVerse >= resteAPayer) {
      statutPaiement = 'complet';
    }
    
    // Créer le paiement
    const paiement = await this.create({
      reference: reference,
      ...paiementData,
      statut_paiement: statutPaiement,
      statut_jour: 'partiel',
      date_paiement: new Date().toISOString().split('T')[0],
      heure_paiement: new Date().toTimeString().split(' ')[0],
      reste_a_verser: Math.max(0, resteAPayer - montantVerse),
      retard_accumule: montantDu.retard_accumule || 0
    });

    // Mettre à jour les statuts des jours
    await this.mettreAJourStatutsJours(paiement.livreur_id);

    return paiement;
  } catch (error) {
    console.error('Erreur création paiement espèces:', error);
    throw error;
  }
};

// ========== MÉTHODES D'AFFICHAGE ==========

Paiement.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  
  // Formatage des montants
  values.montant_verse_formate = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0
  }).format(values.montant_verse);
  
  values.montant_du_jour_formate = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0
  }).format(values.montant_du_jour);
  
  values.reste_a_verser_formate = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0
  }).format(values.reste_a_verser);
  
  values.retard_accumule_formate = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0
  }).format(values.retard_accumule);
  
  // Formatage des dates
  if (values.date_paiement) {
    values.date_paiement_formatee = new Date(values.date_paiement).toLocaleDateString('fr-FR');
  }
  
  if (values.heure_paiement) {
    values.heure_paiement_formatee = values.heure_paiement.substring(0, 5);
  }
  
  return values;
};

// ========== MÉTHODES DE RAPPORT ==========

// Historique des paiements
Paiement.getHistoriquePaiements = async function(livreurId, mois = null, annee = null) {
  const whereCondition = { livreur_id: livreurId };
  
  // Filtrer par mois et année
  if (mois && annee) {
    whereCondition.date_paiement = {
      [Op.and]: [
        { [Op.gte]: `${annee}-${mois.padStart(2, "0")}-01` },
        { [Op.lte]: `${annee}-${mois.padStart(2, "0")}-31` },
      ],
    };
  }
  
  const paiements = await this.findAll({
    where: whereCondition,
    order: [
      ["date_paiement", "DESC"],
      ["heure_paiement", "DESC"],
    ],
  });
  
  // Regrouper par jour
  const joursMap = {};
  
  for (const paiement of paiements) {
    const date = paiement.date_paiement;
    
    if (!joursMap[date]) {
      joursMap[date] = {
        date: date,
        montant_du_jour: 7000,
        total_verse: 0,
        reste_a_verser: 0,
        statut_jour: 'partiel',
        paiements: [],
        paiements_complets: 0
      };
    }
    
    joursMap[date].paiements.push(paiement);
    
    // Seuls les paiements complets comptent
    if (paiement.statut_paiement === 'complet') {
      joursMap[date].total_verse += parseFloat(paiement.montant_verse);
      joursMap[date].paiements_complets++;
    }
    
    // Prendre le statut jour du dernier paiement
    joursMap[date].statut_jour = paiement.statut_jour;
  }
  
  // Calculer le reste à verser pour chaque jour
  const jours = Object.values(joursMap).map(jour => {
    jour.reste_a_verser = Math.max(0, jour.montant_du_jour - jour.total_verse);
    return jour;
  });
  
  // Statistiques
  const totalVerse = jours.reduce((sum, jour) => sum + jour.total_verse, 0);
  const joursComplets = jours.filter(j => j.statut_jour === 'complet').length;
  const joursEnRetard = jours.filter(j => j.statut_jour === 'en_retard').length;
  
  return {
    total_jours: jours.length,
    total_verse: totalVerse,
    jours_complets: joursComplets,
    jours_en_retard: joursEnRetard,
    jours: jours.sort((a, b) => new Date(b.date) - new Date(a.date))
  };
};

module.exports = Paiement;