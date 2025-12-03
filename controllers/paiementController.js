const Paiement = require("../models/Paiement");
const Livreur = require("../models/Livreur");
const { Op } = require("sequelize");

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// @desc    Voir le montant dû aujourd'hui (7000F + retard)
// @route   GET /api/paiements/montant-du
const getMontantDuAujourdhui = asyncHandler(async (req, res) => {
  console.log("\n💰 MONTANT DÛ AUJOURD'HUI");

  const livreurId = req.livreur.id;

  try {
    const montantDu = await Paiement.getMontantDuAujourdhui(livreurId);

    return res.status(200).json({
      success: true,
      message: "Montant dû calculé",
      ...montantDu,
      date: new Date().toISOString().split("T")[0],
    });
  } catch (error) {
    console.error("Erreur calcul montant dû:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors du calcul du montant dû",
    });
  }
});

// @desc    Enregistrer un paiement
// @route   POST /api/paiements
const creerPaiement = asyncHandler(async (req, res) => {
  console.log("\n💰 ENREGISTREMENT PAIEMENT");

  const livreurId = req.livreur.id;

  const { montant_verse, mode_paiement, numero_utilise, description } =
    req.body;

  // Validation
  if (!montant_verse || !mode_paiement) {
    return res.status(400).json({
      success: false,
      message: "Montant versé et mode de paiement sont obligatoires",
    });
  }

  if (montant_verse <= 0) {
    return res.status(400).json({
      success: false,
      message: "Le montant versé doit être supérieur à 0",
    });
  }

  // Vérifier si c'est un paiement mobile
  const paiementsMobile = ["wave", "orange_money", "mtn_money"];
  const isMobilePayment = paiementsMobile.includes(mode_paiement);

  if (isMobilePayment && !numero_utilise) {
    return res.status(400).json({
      success: false,
      message: `Le numéro de téléphone est obligatoire pour les paiements ${mode_paiement}`,
    });
  }

  try {
    // Récupérer les infos du livreur
    const livreur = await Livreur.findByPk(livreurId);

    if (!livreur) {
      return res.status(404).json({
        success: false,
        message: "Livreur non trouvé",
      });
    }

    // Vérifier combien il doit aujourd'hui
    const montantDu = await Paiement.getMontantDuAujourdhui(livreurId);

    // Vérifier que le paiement ne dépasse pas ce qui est dû
    const totalApresPaiement =
      (montantDu.deja_paye_aujourdhui || 0) + parseFloat(montant_verse);

    if (totalApresPaiement > montantDu.total_a_payer) {
      return res.status(400).json({
        success: false,
        message: `Montant trop élevé. Maximum accepté: ${
          montantDu.total_a_payer - montantDu.deja_paye_aujourdhui
        } FCFA`,
      });
    }

    // GÉNÉRER LA RÉFÉRENCE UNIQUE
    const genererReference = () => {
      const date = new Date();
      const timestamp = date.getTime();
      const random = Math.floor(1000 + Math.random() * 9000);
      const livreurCode = livreurId.toString().padStart(4, "0");
      return `CP${livreurCode}${timestamp.toString().slice(-8)}${random}`;
    };

    const transactionId = genererReference();

    // POUR LES PAIEMENTS EN ESPÈCES (direct)
    if (mode_paiement === "especes") {
      // GÉNÉRER L'HEURE
      const genererHeure = () => {
        const now = new Date();
        return now.toTimeString().split(" ")[0];
      };

      // Calculer le nouveau reste à verser
      const nouveauResteAVerser = Math.max(
        0,
        montantDu.reste_a_payer - parseFloat(montant_verse)
      );

      // Déterminer le statut
      let statut = "partiel";
      if (nouveauResteAVerser <= 0) {
        statut = "complet";
      }

      // Créer le paiement
      const paiement = await Paiement.create({
        reference: transactionId,
        livreur_id: livreurId,
        livreur_nom: livreur.nom,
        livreur_prenom: livreur.prenom,
        livreur_telephone: livreur.telephone,
        montant_verse: parseFloat(montant_verse),
        montant_du_jour: 7000,
        mode_paiement,
        numero_utilise: numero_utilise || null,
        description: description || null,
        date_paiement: new Date().toISOString().split("T")[0],
        heure_paiement: genererHeure(),
        statut: statut,
        reste_a_verser: nouveauResteAVerser,
        retard_accumule: montantDu.retard_accumule || 0,
      });

      // Mettre à jour les soldes
      await Paiement.mettreAJourTousSoldes(livreurId);
      const nouveauMontantDu = await Paiement.getMontantDuAujourdhui(livreurId);

      return res.status(201).json({
        success: true,
        message: "Paiement en espèces enregistré avec succès",
        paiement: paiement.toJSON(),
        nouveau_solde: nouveauMontantDu,
      });
    }

    // POUR LES PAIEMENTS MOBILE MONEY (CinetPay)
    if (isMobilePayment) {
      try {
        console.log("Initialisation paiement CinetPay...");

        // Utiliser ALL comme canal (CinetPay accepte ALL pour tous les paiements)
        const channel = "ALL";

        // Déterminer l'opérateur selon le mode de paiement
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

        // IMPORTANT: Pour que CinetPay accepte ALL, on doit utiliser designations
        const designations = {
          ORANGE: ["ORANGE"],
          MTN: ["MTN"],
          WAVE: ["WAVE"],
        };

        // Ajouter operator_id si disponible (spécifique à l'opérateur)
        let operatorId = "";
        if (operator === "ORANGE" || operator === "MTN") {
          operatorId = operator.toLowerCase(); // orange ou mtn
        }

        // URLs dynamiques
        const baseUrl = process.env.APP_URL || "http://localhost:5000";
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

        // IMPORTANT: Construction des URLs
        const notifyUrl = `${baseUrl}/api/paiements/webhook/cinetpay`;
        const returnUrl = `${frontendUrl}/paiement/confirmation?transaction=${transactionId}&livreur=${livreurId}`;

        console.log("📧 notify_url:", notifyUrl);
        console.log("🔗 return_url:", returnUrl);

        const cinetPayPayload = {
          apikey:
            process.env.CINETPAY_API_KEY || "521006956621e4e7a6a3d16.70681548",
          site_id: process.env.CINETPAY_SITE_ID || "859043",
          transaction_id: transactionId,
          amount: parseFloat(montant_verse),
          currency: "XOF",
          channels: channel, // UTILISER ALL
          designation: operator || mode_paiement.toUpperCase(), // Ajouter designation
          description:
            description || `Paiement livreur ${livreur.nom} ${livreur.prenom}`,
          customer_name: `${livreur.nom} ${livreur.prenom}`,
          customer_surname: livreur.nom,
          customer_email:
            livreur.email ||
            `${livreur.telephone?.replace("+", "") || "user"}@livreur.com`,
          customer_phone_number: numero_utilise || livreur.telephone,
          notify_url:
            process.env.CINETPAY_NOTIFY_URL ||
            `${
              process.env.APP_URL || "http://localhost:5000"
            }/api/paiements/webhook/cinetpay`,
          return_url:
            process.env.CINETPAY_RETURN_URL ||
            `${
              process.env.FRONTEND_URL || "http://localhost:3000"
            }/paiement/confirmation`,
          metadata: JSON.stringify({
            livreur_id: livreurId,
            livreur_nom: livreur.nom,
            livreur_prenom: livreur.prenom,
            mode_paiement: mode_paiement,
            montant: montant_verse,
            operator: operator,
          }),
          customer_address: livreur.adresse || "Non spécifié",
          customer_city: "Abidjan",
          customer_country: "CI",
          customer_state: "CI",
          customer_zip_code: "00000",
        };

        // Ajouter operator_id si nécessaire
        if (operatorId) {
          cinetPayPayload.operator_id = operatorId;
        }

        console.log(
          "Payload CinetPay envoyé:",
          JSON.stringify(cinetPayPayload, null, 2)
        );

        // Appel à l'API CinetPay
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

        const data = await response.json();
        console.log(
          "Réponse CinetPay complète:",
          JSON.stringify(data, null, 2)
        );

        // Vérifier la réponse CinetPay
        if (
          data.code === "201" ||
          data.code === "CREATED" ||
          data.code === "00"
        ) {
          // SUCCÈS: Le paiement a été créé avec succès
          console.log("✅ Paiement CinetPay initialisé avec succès");

          // Créer le paiement en statut "en_attente"
          const paiement = await Paiement.create({
            reference: transactionId,
            livreur_id: livreurId,
            livreur_nom: livreur.nom,
            livreur_prenom: livreur.prenom,
            livreur_telephone: livreur.telephone,
            montant_verse: parseFloat(montant_verse),
            montant_du_jour: 7000,
            mode_paiement,
            numero_utilise: numero_utilise || livreur.telephone,
            description: description || `Paiement ${mode_paiement} en attente`,
            date_paiement: new Date().toISOString().split("T")[0],
            heure_paiement: new Date().toTimeString().split(" ")[0],
            statut: "en_attente",
            reste_a_verser: montantDu.reste_a_payer,
            retard_accumule: montantDu.retard_accumule || 0,
          });

          // URL de paiement à retourner
          let paymentUrl = data.data?.payment_url;
          if (!paymentUrl && data.data?.payment_token) {
            paymentUrl = `https://secure.cinetpay.com/?method=token&token=${data.data.payment_token}`;
          }

          return res.status(200).json({
            success: true,
            message: "Paiement mobile initialisé avec succès",
            transaction_id: transactionId,
            payment_data: {
              payment_url: paymentUrl,
              payment_token: data.data?.payment_token || null,
              operator: operator,
              qrcode: data.data?.qrcode || null,
            },
            paiement: {
              id: paiement.id,
              reference: paiement.reference,
              montant: paiement.montant_verse,
              statut: paiement.statut,
              date: paiement.date_paiement,
            },
            instructions: `Suivez les instructions pour compléter le paiement.`,
            note: "Redirigez l'utilisateur vers payment_url pour compléter le paiement",
          });
        } else {
          // ERREUR: Gérer les erreurs CinetPay
          console.error(
            "❌ Erreur CinetPay:",
            data.message || "Erreur inconnue"
          );
          throw new Error(data.message || `Code erreur: ${data.code}`);
        }
      } catch (cinetpayError) {
        console.error("❌ Erreur détaillée CinetPay:", cinetpayError.message);

        // En cas d'échec, créer un paiement en échec
        await Paiement.create({
          reference: transactionId,
          livreur_id: livreurId,
          livreur_nom: livreur.nom,
          livreur_prenom: livreur.prenom,
          livreur_telephone: livreur.telephone,
          montant_verse: parseFloat(montant_verse),
          montant_du_jour: 7000,
          mode_paiement,
          numero_utilise: numero_utilise || null,
          description: `Échec CinetPay: ${cinetpayError.message}`,
          date_paiement: new Date().toISOString().split("T")[0],
          heure_paiement: new Date().toTimeString().split(" ")[0],
          statut: "echoue",
          reste_a_verser: montantDu.reste_a_payer,
          retard_accumule: montantDu.retard_accumule || 0,
        });

        return res.status(500).json({
          success: false,
          message: `Erreur lors de l'initialisation du paiement ${mode_paiement}`,
          error: cinetpayError.message,
          transaction_id: transactionId,
          suggestion:
            "Veuillez essayer avec un autre mode de paiement ou contacter le support.",
        });
      }
    }

    // Si le mode de paiement n'est pas reconnu
    return res.status(400).json({
      success: false,
      message: "Mode de paiement non supporté",
    });
  } catch (error) {
    console.error("❌ Erreur création paiement:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de l'enregistrement du paiement",
      error: error.message,
    });
  }
});

// @desc    Vérifier et mettre à jour les paiements en attente
// @route   GET /api/paiements/verifier-en-attente
const verifierPaiementsEnAttente = asyncHandler(async (req, res) => {
  console.log("\n🔍 VÉRIFICATION DES PAIEMENTS EN ATTENTE");

  const livreurId = req.livreur.id;

  try {
    // Récupérer tous les paiements en attente du livreur
    const paiementsEnAttente = await Paiement.findAll({
      where: {
        livreur_id: livreurId,
        statut: "en_attente",
        mode_paiement: ["wave", "orange_money", "mtn_money"],
        date_paiement: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000), // Dernières 24h
        },
      },
    });

    console.log(
      `Paiements en attente à vérifier: ${paiementsEnAttente.length}`
    );

    const resultats = [];

    // Vérifier chaque paiement auprès de CinetPay
    for (const paiement of paiementsEnAttente) {
      try {
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
              transaction_id: paiement.reference,
            }),
          }
        );

        const data = await response.json();

        let nouveauStatut = paiement.statut;
        let message = "";

        if (
          data.code === "00" &&
          data.data &&
          data.data.status === "ACCEPTED"
        ) {
          nouveauStatut = "complet";
          message = "Paiement confirmé";

          // Mettre à jour le paiement
          await paiement.update({
            statut: nouveauStatut,
            description: `Paiement confirmé via vérification manuelle - ${new Date().toLocaleString()}`,
          });

          // Mettre à jour les soldes
          await Paiement.mettreAJourTousSoldes(livreurId);
        } else if (
          data.code === "00" &&
          data.data &&
          data.data.status === "REFUSED"
        ) {
          nouveauStatut = "echoue";
          message = "Paiement refusé";

          await paiement.update({
            statut: nouveauStatut,
            description: `Paiement refusé - ${
              data.data.message || "Raison inconnue"
            }`,
          });
        } else {
          message = `Statut inconnu: ${data.data?.status || data.message}`;
        }

        resultats.push({
          reference: paiement.reference,
          ancien_statut: paiement.statut,
          nouveau_statut: nouveauStatut,
          message: message,
          montant: paiement.montant_verse,
          date: paiement.date_paiement,
        });
      } catch (error) {
        console.error(
          `Erreur vérification ${paiement.reference}:`,
          error.message
        );
        resultats.push({
          reference: paiement.reference,
          ancien_statut: paiement.statut,
          nouveau_statut: paiement.statut,
          message: `Erreur vérification: ${error.message}`,
          montant: paiement.montant_verse,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Vérification terminée pour ${paiementsEnAttente.length} paiements`,
      resultats: resultats,
      date_verification: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erreur vérification paiements en attente:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la vérification des paiements en attente",
    });
  }
});

// @desc    Vérifier un paiement spécifique
// @route   POST /api/paiements/verifier
const verifierPaiement = asyncHandler(async (req, res) => {
  const { transaction_id } = req.body;
  const livreurId = req.livreur.id;

  if (!transaction_id) {
    return res.status(400).json({
      success: false,
      message: "ID de transaction requis",
    });
  }

  try {
    // Trouver le paiement
    const paiement = await Paiement.findOne({
      where: {
        reference: transaction_id,
        livreur_id: livreurId,
      },
    });

    if (!paiement) {
      return res.status(404).json({
        success: false,
        message: "Paiement non trouvé",
      });
    }

    // Si déjà terminé
    if (
      paiement.statut === "complet" ||
      paiement.statut === "echoue" ||
      paiement.statut === "annule"
    ) {
      return res.json({
        success: true,
        statut: paiement.statut,
        message: `Paiement ${paiement.statut}`,
        paiement: paiement.toJSON(),
      });
    }

    // Vérifier auprès de CinetPay
    try {
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
      console.log("Réponse vérification:", data);

      let nouveauStatut = paiement.statut;
      let message = "En attente";

      if (data.code === "00" && data.data) {
        switch (data.data.status) {
          case "ACCEPTED":
            nouveauStatut = "complet";
            message = "Paiement confirmé";

            await paiement.update({
              statut: nouveauStatut,
              description: `Confirmé le ${new Date().toLocaleString()}`,
            });

            // Mettre à jour les soldes
            await Paiement.mettreAJourTousSoldes(livreurId);
            break;

          case "REFUSED":
            nouveauStatut = "echoue";
            message = "Paiement refusé";

            await paiement.update({
              statut: nouveauStatut,
              description: `Refusé: ${data.data.message || "Raison inconnue"}`,
            });
            break;

          case "PENDING":
            nouveauStatut = "en_attente";
            message = "En attente de confirmation";
            break;

          default:
            message = `Statut: ${data.data.status}`;
        }
      }

      return res.json({
        success: true,
        statut: nouveauStatut,
        message: message,
        paiement: paiement.toJSON(),
        cinetpay_data: data,
      });
    } catch (checkError) {
      console.error("Erreur vérification CinetPay:", checkError);

      return res.json({
        success: true,
        statut: paiement.statut,
        message: "Impossible de vérifier auprès de CinetPay",
        paiement: paiement.toJSON(),
        error: checkError.message,
      });
    }
  } catch (error) {
    console.error("Erreur vérification paiement:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur de vérification",
    });
  }
});

// @desc    Voir les paiements en attente
// @route   GET /api/paiements/en-attente
const getPaiementsEnAttente = asyncHandler(async (req, res) => {
  const livreurId = req.livreur.id;

  try {
    const paiements = await Paiement.findAll({
      where: {
        livreur_id: livreurId,
        statut: "en_attente",
        mode_paiement: ["wave", "orange_money", "mtn_money"],
        createdAt: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 dernières heures
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

// @desc    Voir l'historique des paiements
// @route   GET /api/paiements/historique
const getHistoriquePaiements = asyncHandler(async (req, res) => {
  console.log("\n📄 HISTORIQUE DES PAIEMENTS");

  const livreurId = req.livreur.id;
  const { mois, annee } = req.query;

  try {
    const whereCondition = { livreur_id: livreurId };

    // Filtrer par mois et année si fournis
    if (mois && annee) {
      whereCondition.date_paiement = {
        [Op.and]: [
          { [Op.gte]: `${annee}-${mois.padStart(2, "0")}-01` },
          { [Op.lte]: `${annee}-${mois.padStart(2, "0")}-31` },
        ],
      };
    }

    const paiements = await Paiement.findAll({
      where: whereCondition,
      order: [
        ["date_paiement", "DESC"],
        ["heure_paiement", "DESC"],
      ],
      limit: 100,
    });

    // Regrouper par jour
    const paiementsParJour = {};
    let totalVerse = 0;

    paiements.forEach((p) => {
      const date = p.date_paiement;
      if (!paiementsParJour[date]) {
        paiementsParJour[date] = {
          date: date,
          montant_du_jour: p.montant_du_jour,
          montant_verse: 0,
          paiements: [],
        };
      }
      paiementsParJour[date].montant_verse += parseFloat(p.montant_verse);
      paiementsParJour[date].paiements.push(p);
      totalVerse += parseFloat(p.montant_verse);
    });

    // Transformer en tableau
    const jours = Object.values(paiementsParJour).map((jour) => ({
      ...jour,
      reste_a_verser: Math.max(0, jour.montant_du_jour - jour.montant_verse),
      statut:
        jour.montant_du_jour - jour.montant_verse <= 0 ? "complet" : "partiel",
    }));

    // Calculer les statistiques
    const joursComplets = jours.filter((j) => j.statut === "complet").length;
    const joursEnRetard = jours.filter((j) => {
      const jourDate = new Date(j.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return j.statut === "partiel" && jourDate < today;
    }).length;

    return res.status(200).json({
      success: true,
      total_jours: jours.length,
      total_verse: totalVerse,
      jours_complets: joursComplets,
      jours_en_retard: joursEnRetard,
      jours: jours.sort((a, b) => new Date(b.date) - new Date(a.date)),
    });
  } catch (error) {
    console.error("Erreur récupération historique:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de l'historique",
    });
  }
});

// @desc    Voir le détail d'un jour spécifique
// @route   GET /api/paiements/jour/:date
const getPaiementsDuJour = asyncHandler(async (req, res) => {
  const { date } = req.params;
  const livreurId = req.livreur.id;

  try {
    const paiements = await Paiement.findAll({
      where: {
        livreur_id: livreurId,
        date_paiement: date,
      },
      order: [["heure_paiement", "DESC"]],
    });

    const totalVerse = paiements.reduce(
      (sum, p) => sum + parseFloat(p.montant_verse),
      0
    );
    const montantDuJour =
      paiements.length > 0 ? paiements[0].montant_du_jour : 7000;

    const aujourdhui = new Date().toISOString().split("T")[0];
    const statut =
      totalVerse >= montantDuJour
        ? "complet"
        : date < aujourdhui
        ? "en_retard"
        : "partiel";

    return res.status(200).json({
      success: true,
      date: date,
      montant_du_jour: montantDuJour,
      total_verse: totalVerse,
      reste_a_verser: Math.max(0, montantDuJour - totalVerse),
      statut: statut,
      nombre_paiements: paiements.length,
      paiements: paiements,
    });
  } catch (error) {
    console.error("Erreur récupération jour:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des paiements du jour",
    });
  }
});

module.exports = {
  getMontantDuAujourdhui,
  creerPaiement,
  getHistoriquePaiements,
  getPaiementsDuJour,
  verifierPaiement,
  getPaiementsEnAttente,
  verifierPaiementsEnAttente,
};
