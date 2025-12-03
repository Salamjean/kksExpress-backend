const Paiement = require("../models/Paiement");
const Livreur = require("../models/Livreur");
const { Op } = require("sequelize");

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// @desc    Initialiser un paiement mobile
// @route   POST /api/paiements/mobile/initier
const initierPaiementMobile = asyncHandler(async (req, res) => {
  console.log("\n📱 INITIALISATION PAIEMENT MOBILE");

  const livreurId = req.livreur.id;
  const { montant, mode_paiement, numero_utilise, description } = req.body;

  // Validation
  if (!montant || !mode_paiement) {
    return res.status(400).json({
      success: false,
      message: "Montant et mode de paiement sont obligatoires",
    });
  }

  if (montant <= 0) {
    return res.status(400).json({
      success: false,
      message: "Le montant doit être supérieur à 0",
    });
  }

  // Vérifier les modes de paiement mobile
  const paiementsMobile = ["wave", "orange_money", "mtn_money"];
  if (!paiementsMobile.includes(mode_paiement)) {
    return res.status(400).json({
      success: false,
      message: "Mode de paiement mobile non supporté",
    });
  }

  // Vérifier le numéro pour les paiements mobile
  if (!numero_utilise) {
    return res.status(400).json({
      success: false,
      message: "Numéro de téléphone obligatoire pour les paiements mobile",
    });
  }

  try {
    // Récupérer le livreur
    const livreur = await Livreur.findByPk(livreurId);
    if (!livreur) {
      return res.status(404).json({
        success: false,
        message: "Livreur non trouvé",
      });
    }

    // Vérifier le montant dû
    const montantDu = await Paiement.getMontantDuAujourdhui(livreurId);
    const montantVerseAujourdhui = montantDu.deja_paye_aujourdhui || 0;
    const resteAPayer = montantDu.reste_a_payer;

    // Vérifier si le paiement dépasse ce qui est dû
    if (parseFloat(montant) > resteAPayer) {
      return res.status(400).json({
        success: false,
        message: `Montant trop élevé. Maximum accepté: ${resteAPayer} FCFA`,
        details: {
          total_du: montantDu.total_a_payer,
          deja_paye: montantVerseAujourdhui,
          reste_a_payer: resteAPayer,
        },
      });
    }

    // Préparer les données pour le paiement
    const paiementData = {
      livreur_id: livreurId,
      livreur_nom: livreur.nom,
      livreur_prenom: livreur.prenom,
      livreur_telephone: livreur.telephone,
      montant_verse: parseFloat(montant),
      montant_du_jour: 7000,
      mode_paiement: mode_paiement,
      numero_utilise: numero_utilise,
      description: description || `Paiement ${mode_paiement} en cours`,
      reste_a_verser: resteAPayer - parseFloat(montant),
      retard_accumule: montantDu.retard_accumule || 0,
    };

    // Initialiser le paiement dans la base de données
    const initResult = await Paiement.initialiserPaiementMobile(paiementData);

    // Maintenant, initialiser le paiement chez CinetPay
    const transactionId = initResult.transaction_id;

    // Déterminer l'opérateur
    let operator = "";
    switch (mode_paiement) {
      case "orange_money":
        operator = "ORANGE";
        break;
      case "mtn_money":
        operator = "MTN";
        break;
      case "wave":
        operator = "WAVE";
        break;
    }

    // Préparer le payload CinetPay
    // Construisez les URLs correctement
    const baseUrl = process.env.APP_URL || "http://localhost:5000";
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    const cinetPayPayload = {
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id: transactionId,
      amount: parseFloat(montant),
      currency: "XOF",
      channels: "ALL",
      designation: `Paiement livreur ${livreur.nom}`,
      description: description || `Paiement ${mode_paiement}`,

      // Informations client
      customer_name: `${livreur.nom} ${livreur.prenom}`,
      customer_surname: livreur.nom,
      customer_email: `${numero_utilise.replace(/\D/g, "")}@livreur.com`, // Enlève tous les caractères non numériques
      customer_phone_number: numero_utilise,
      customer_address: livreur.adresse || "Abidjan, Côte d'Ivoire",
      customer_city: "Abidjan",
      customer_country: "CI",
      customer_state: "CI",
      customer_zip_code: "00000",

      // URLs CORRIGÉES - construites dynamiquement
      notify_url: `https://carol-peritectic-bentley.ngrok-free.dev/api/paiements/webhook/cinetpay`,
      return_url: `https://carol-peritectic-bentley.ngrok-free.dev/api/paiements/confirmation-page`,

      // Metadata
      metadata: JSON.stringify({
        livreur_id: livreurId,
        livreur_nom: livreur.nom,
        livreur_prenom: livreur.prenom,
        mode_paiement: mode_paiement,
        montant: montant,
      }),
    };

    console.log("Envoi à CinetPay:", JSON.stringify(cinetPayPayload, null, 2));

    // Appeler CinetPay
    const response = await fetch(
      "https://api-checkout.cinetpay.com/v2/payment",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(cinetPayPayload),
      }
    );

    const cinetpayData = await response.json();
    console.log("Réponse CinetPay:", JSON.stringify(cinetpayData, null, 2));

    if (cinetpayData.code === "201" || cinetpayData.code === "00") {
      // Succès: retourner l'URL de paiement
      let paymentUrl = cinetpayData.data?.payment_url;

      return res.status(200).json({
        success: true,
        message: "Paiement initialisé avec succès",
        transaction_id: transactionId,
        payment_data: {
          payment_url: paymentUrl,
          payment_token: cinetpayData.data?.payment_token,
          operator: operator,
        },
        paiement: initResult.paiement.toJSON(),
        instructions: "Veuillez suivre le lien pour compléter le paiement",
      });
    } else {
      // Échec CinetPay: mettre à jour le statut
      await Paiement.marquerPaiementEchoue(
        transactionId,
        cinetpayData.message || "Erreur CinetPay"
      );

      return res.status(400).json({
        success: false,
        message: "Erreur lors de l'initialisation du paiement",
        error: cinetpayData.message || `Code erreur: ${cinetpayData.code}`,
        transaction_id: transactionId,
      });
    }
  } catch (error) {
    console.error("❌ Erreur initialisation paiement mobile:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur lors de l'initialisation",
      error: error.message,
    });
  }
});

// @desc    Vérifier et valider un paiement
// @route   POST /api/paiements/mobile/verifier
const verifierEtValiderPaiement = asyncHandler(async (req, res) => {
  console.log("\n✅ VÉRIFICATION ET VALIDATION PAIEMENT");

  const { transaction_id } = req.body;
  const livreurId = req.livreur.id;

  if (!transaction_id) {
    return res.status(400).json({
      success: false,
      message: "ID de transaction requis",
    });
  }

  try {
    // Vérifier que le paiement existe et appartient au livreur
    const paiement = await Paiement.findOne({
      where: {
        reference: transaction_id,
        livreur_id: livreurId,
      },
    });

    if (!paiement) {
      return res.status(404).json({
        success: false,
        message: "Transaction non trouvée",
      });
    }

    // Si déjà terminé, retourner le statut actuel
    if (paiement.statut === "complet") {
      return res.json({
        success: true,
        message: "Paiement déjà validé",
        paiement: paiement.toJSON(),
        etat: "complet",
      });
    }

    if (paiement.statut === "echoue" || paiement.statut === "annule") {
      return res.json({
        success: false,
        message: `Paiement ${paiement.statut}`,
        paiement: paiement.toJSON(),
        etat: paiement.statut,
      });
    }

    // Vérifier auprès de CinetPay
    const response = await fetch(
      "https://api-checkout.cinetpay.com/v2/payment/check",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          apikey: process.env.CINETPAY_API_KEY,
          site_id: process.env.CINETPAY_SITE_ID,
          transaction_id: transaction_id,
        }),
      }
    );

    const data = await response.json();
    console.log(
      "Réponse vérification CinetPay:",
      JSON.stringify(data, null, 2)
    );

    let resultat = {
      success: false,
      message: "",
      etat: "inconnu",
      paiement: null,
    };

    if (data.code === "00" && data.data) {
      const statutCinetPay = data.data.status;

      switch (statutCinetPay) {
        case "ACCEPTED":
        case "SUCCESS":
          // Paiement accepté: le confirmer
          const details = {
            mode_paiement: paiement.mode_paiement,
            payment_method: data.data.payment_method,
            cel_phone_num: data.data.cel_phone_num || paiement.numero_utilise,
          };

          const paiementConfirme = await Paiement.confirmerPaiementMobile(
            transaction_id,
            details
          );

          resultat = {
            success: true,
            message: "Paiement confirmé avec succès",
            etat: "complet",
            paiement: paiementConfirme.toJSON(),
            cinetpay_details: data.data,
          };
          break;

        case "REFUSED":
        case "FAILED":
          // Paiement refusé
          await Paiement.marquerPaiementEchoue(
            transaction_id,
            data.data.message || "Refusé par l'opérateur"
          );

          // Recharger le paiement mis à jour
          const paiementEchoue = await Paiement.findOne({
            where: { reference: transaction_id },
          });

          resultat = {
            success: false,
            message: "Paiement refusé",
            etat: "echoue",
            paiement: paiementEchoue.toJSON(),
          };
          break;

        case "PENDING":
          // Toujours en attente
          resultat = {
            success: false,
            message: "Paiement en attente de traitement",
            etat: "en_attente",
            paiement: paiement.toJSON(),
          };
          break;

        case "CANCELLED":
          // Annulé
          await paiement.update({
            statut: "annule",
            description: "Annulé par l'utilisateur",
          });

          resultat = {
            success: false,
            message: "Paiement annulé",
            etat: "annule",
            paiement: paiement.toJSON(),
          };
          break;

        default:
          resultat = {
            success: false,
            message: `Statut inconnu: ${statutCinetPay}`,
            etat: "inconnu",
            paiement: paiement.toJSON(),
          };
      }
    } else {
      // Erreur de vérification
      resultat = {
        success: false,
        message: data.message || "Erreur de vérification",
        etat: "erreur_verification",
        paiement: paiement.toJSON(),
      };
    }

    return res.json(resultat);
  } catch (error) {
    console.error("❌ Erreur vérification paiement:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la vérification",
      error: error.message,
    });
  }
});

// @desc    Voir les paiements mobiles en attente
// @route   GET /api/paiements/mobile/en-attente
const getPaiementsMobileEnAttente = asyncHandler(async (req, res) => {
  const livreurId = req.livreur.id;

  try {
    const paiements = await Paiement.findAll({
      where: {
        livreur_id: livreurId,
        statut: "en_attente",
        mode_paiement: ["wave", "orange_money", "mtn_money"],
        createdAt: {
          [Op.gte]: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 dernières heures
        },
      },
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      success: true,
      count: paiements.length,
      paiements: paiements.map((p) => p.toJSON()),
    });
  } catch (error) {
    console.error("Erreur récupération paiements en attente:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
});

// @desc    Annuler un paiement en attente
// @route   POST /api/paiements/mobile/annuler
const annulerPaiementMobile = asyncHandler(async (req, res) => {
  const { transaction_id } = req.body;
  const livreurId = req.livreur.id;

  if (!transaction_id) {
    return res.status(400).json({
      success: false,
      message: "ID de transaction requis",
    });
  }

  try {
    const paiement = await Paiement.findOne({
      where: {
        reference: transaction_id,
        livreur_id: livreurId,
        statut: "en_attente",
      },
    });

    if (!paiement) {
      return res.status(404).json({
        success: false,
        message: "Paiement en attente non trouvé",
      });
    }

    // Marquer comme annulé
    await paiement.update({
      statut: "annule",
      description: "Annulé manuellement par l'utilisateur",
    });

    return res.json({
      success: true,
      message: "Paiement annulé avec succès",
      paiement: paiement.toJSON(),
    });
  } catch (error) {
    console.error("Erreur annulation paiement:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de l'annulation",
    });
  }
});

module.exports = {
  initierPaiementMobile,
  verifierEtValiderPaiement,
  getPaiementsMobileEnAttente,
  annulerPaiementMobile,
};
