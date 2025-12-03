const express = require('express');
const router = express.Router();
const { protectLivreur } = require('../middleware/livreurMiddleware');
const { verifierSignatureCinetPay } = require('../middleware/paiementWebhook');
const Paiement = require('../models/Paiement');
const { generateConfirmationPage } = require('../utils/htmlTemplates');

const {
  getMontantDuAujourdhui,
  creerPaiement,
  getHistoriquePaiements,
  getPaiementsDuJour,
  verifierPaiement,
  getPaiementsEnAttente,
  verifierPaiementsEnAttente
} = require('../controllers/paiementController');
const {
  initierPaiementMobile,
  verifierEtValiderPaiement,
  getPaiementsMobileEnAttente,
  annulerPaiementMobile
} = require('../controllers/paiementMobileController');

// ========== ROUTES SIMPLES POUR TEST ==========
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API Paiements fonctionne',
    routes: [
      '/mobile/initier',
      '/mobile/verifier',
      '/confirmation-page',
      '/montant-du',
      '/historique'
    ]
  });
});

// ========== PAGE DE CONFIRMATION ==========
router.get('/confirmation-page', (req, res) => {
  console.log('📄 Page confirmation demandée');
  
  const transactionId = req.query.reference || req.query.transaction_id || req.query.cpm_trans_id;
  const livreurId = req.query.livreur_id;
  const status = req.query.cpm_page_action || req.query.status || 'pending';
  const message = req.query.cpm_error_message || req.query.message || '';
  
  console.log('Params:', { transactionId, livreurId, status, message });
  
  try {
    const html = generateConfirmationPage(transactionId, livreurId, status, message);
    res.send(html);
  } catch (error) {
    console.error('❌ Erreur génération page:', error);
    res.status(500).send('<h1>Erreur serveur</h1><p>' + error.message + '</p>');
  }
});

// ========== ROUTES MOBILES ==========
router.post('/mobile/initier', protectLivreur, initierPaiementMobile);
router.post('/mobile/verifier', protectLivreur, verifierEtValiderPaiement);
router.get('/mobile/en-attente', protectLivreur, getPaiementsMobileEnAttente);
router.post('/mobile/annuler', protectLivreur, annulerPaiementMobile);

// ========== ROUTES EXISTANTES ==========
router.get('/montant-du', protectLivreur, getMontantDuAujourdhui);
router.post('/', protectLivreur, creerPaiement);
router.get('/historique', protectLivreur, getHistoriquePaiements);
router.get('/jour/:date', protectLivreur, getPaiementsDuJour);

// ========== ROUTES DE VÉRIFICATION ==========
router.post('/verifier', protectLivreur, verifierPaiement);
router.get('/en-attente', protectLivreur, getPaiementsEnAttente);
router.get('/verifier-en-attente', protectLivreur, verifierPaiementsEnAttente);

// Webhook CinetPay CORRIGÉ avec la nouvelle méthode
router.post('/webhook/cinetpay', verifierSignatureCinetPay, async (req, res) => {
  try {
    console.log("=".repeat(50));
    console.log("📱 WEBHOOK CINETPAY REÇU");
    console.log("=".repeat(50));
    
    const {
      cpm_trans_id,
      cpm_page_action,
      cpm_error_message,
      payment_method,
      cel_phone_num,
      cpm_amount,
      cpm_custom
    } = req.body;
    
    const transactionId = cpm_trans_id;
    
    console.log("📋 Données reçues:");
    console.log("- Transaction ID:", transactionId);
    console.log("- Page Action:", cpm_page_action);
    console.log("- Error Message:", cpm_error_message);
    console.log("- Payment Method:", payment_method);
    console.log("- Phone:", cel_phone_num);
    console.log("- Amount:", cpm_amount);
    
    if (!transactionId) {
      console.error("❌ ERREUR: ID de transaction manquant");
      return res.json({
        cpm_result: 'KO',
        cpm_error_message: 'Transaction ID manquant'
      });
    }
    
    // Trouver le paiement
    const paiement = await Paiement.findOne({
      where: { reference: transactionId }
    });
    
    if (!paiement) {
      console.error(`❌ ERREUR: Paiement ${transactionId} non trouvé`);
      return res.json({
        cpm_result: 'KO',
        cpm_error_message: 'Paiement non trouvé'
      });
    }
    
    console.log(`✅ Paiement trouvé. ID: ${paiement.id}, Statut actuel: ${paiement.statut_paiement}`);
    
    // Décoder les métadonnées personnalisées
    let metadata = {};
    try {
      if (cpm_custom) {
        metadata = JSON.parse(cpm_custom);
      }
    } catch (e) {
      console.log("⚠️ Impossible de décoder les métadonnées:", e.message);
    }
    
    // DÉTERMINER LE NOUVEAU STATUT
    let nouveauStatutPaiement = paiement.statut_paiement;
    let description = paiement.description;
    
    // LOGIQUE AMÉLIORÉE
    if (cpm_error_message === 'SUCCES' || cpm_error_message === 'SUCCESS') {
      nouveauStatutPaiement = 'complet';
      description = `Paiement ${cpm_amount} FCFA confirmé via ${payment_method || 'mobile'} (${cel_phone_num || 'numéro inconnu'})`;
      console.log(`🎉 Paiement réussi détecté via error_message: ${cpm_error_message}`);
    } 
    else if (cpm_page_action === 'SUCCESS' || cpm_page_action === 'ACCEPTED') {
      nouveauStatutPaiement = 'complet';
      description = `Paiement ${cpm_amount} FCFA confirmé via ${payment_method || 'mobile'}`;
      console.log(`🎉 Paiement réussi détecté via page_action: ${cpm_page_action}`);
    }
    else if (cpm_page_action === 'PAYMENT') {
      // PAYMENT signifie que le paiement est en cours, pas encore terminé
      nouveauStatutPaiement = 'en_attente';
      description = `Paiement en cours via ${payment_method || 'mobile'}`;
      console.log(`⏳ Paiement en cours...`);
    }
    else if (cpm_error_message && (
      cpm_error_message.includes('REFUSED') ||
      cpm_error_message.includes('FAILED') ||
      cpm_error_message.includes('ECHEC')
    )) {
      nouveauStatutPaiement = 'echoue';
      description = `Échec: ${cpm_error_message}`;
      console.log(`❌ Paiement échoué: ${cpm_error_message}`);
    }
    else if (cpm_page_action === 'CANCELLED') {
      nouveauStatutPaiement = 'annule';
      description = 'Annulé par l\'utilisateur';
      console.log(`❌ Paiement annulé`);
    }
    else {
      console.log(`⚠️  Statut non reconnu, conservation du statut: ${paiement.statut_paiement}`);
    }
    
    // Mettre à jour le paiement
    const updateData = {
      statut_paiement: nouveauStatutPaiement,
      description: description
    };
    
    // Mettre à jour le numéro si disponible et valide
    if (cel_phone_num && cel_phone_num !== '225000' && cel_phone_num !== '000000') {
      updateData.numero_utilise = cel_phone_num;
    }
    
    // Si le statut change
    if (nouveauStatutPaiement !== paiement.statut_paiement) {
      await paiement.update(updateData);
      console.log(`✅ Paiement mis à jour: ${paiement.statut_paiement} → ${nouveauStatutPaiement}`);
      
      // Si le paiement est confirmé, utiliser la méthode de validation
      if (nouveauStatutPaiement === 'complet') {
        try {
          // Utiliser confirmerPaiementMobile si disponible
          if (Paiement.confirmerPaiementMobile) {
            await Paiement.confirmerPaiementMobile(transactionId, {
              mode_paiement: metadata.mode_paiement || payment_method,
              cel_phone_num: cel_phone_num
            });
            console.log(`✅ Paiement confirmé via confirmerPaiementMobile`);
          } 
          // Sinon utiliser mettreAJourStatutsJours
          else if (Paiement.mettreAJourStatutsJours) {
            await Paiement.mettreAJourStatutsJours(paiement.livreur_id);
            console.log(`✅ Statuts des jours mis à jour pour livreur ${paiement.livreur_id}`);
          }
        } catch (updateError) {
          console.error(`❌ Erreur mise à jour statuts:`, updateError.message);
        }
      }
    } else {
      console.log(`ℹ️  Statut inchangé: ${paiement.statut_paiement}`);
    }
    
    // Réponse à CinetPay
    const response = {
      cpm_result: 'OK',
      cpm_trans_id: transactionId,
      cpm_error_message: '',
      cpm_error: '0'
    };
    
    console.log("📤 Réponse à CinetPay:", response);
    console.log("=".repeat(50));
    
    return res.json(response);
    
  } catch (error) {
    console.error("🔥 ERREUR CRITIQUE traitement webhook:", error);
    console.error("Stack trace:", error.stack);
    
    return res.json({
      cpm_result: 'KO',
      cpm_error_message: 'Erreur interne du serveur'
    });
  }
});

module.exports = router;