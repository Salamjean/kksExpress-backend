import re

# Lire le fichier
with open('c:/Users/THEWAYNE/kksExpress-backend/controllers/commande/commandeController.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Ajouter destinataire_nom, destinataire_email, destinataire_contact dans le destructuring
old_destructuring = """  // Données de la commande
  const {
    destinataire_latitude,
    destinataire_longitude,
    destinataire_adresse,
    expediteur_contact_alt,
    expediteur_latitude,
    expediteur_longitude,
    expediteur_adresse,
    type_colis,
    libelle_colis,
    nature_colis,
    description_colis,
    tarif,
  } = req.body;"""

new_destructuring = """  // Données de la commande
  const {
    destinataire_latitude,
    destinataire_longitude,
    destinataire_adresse,
    destinataire_nom,
    destinataire_email,
    destinataire_contact,
    expediteur_contact_alt,
    expediteur_latitude,
    expediteur_longitude,
    expediteur_adresse,
    type_colis,
    libelle_colis,
    nature_colis,
    description_colis,
    tarif,
  } = req.body;"""

content = content.replace(old_destructuring, new_destructuring)

# 2. Ajouter validation pour destinataire_contact
old_validation = """  // Validation
  if (!destinataire_latitude || !destinataire_longitude || !destinataire_adresse) {
    return res.status(400).json({
      success: false,
      message: "Les coordonnées et adresse du destinataire sont obligatoires"
    });
  }"""

new_validation = """  // Validation
  if (!destinataire_latitude || !destinataire_longitude || !destinataire_adresse) {
    return res.status(400).json({
      success: false,
      message: "Les coordonnées et adresse du destinataire sont obligatoires"
    });
  }

  if (!destinataire_contact) {
    return res.status(400).json({
      success: false,
      message: "Le numéro de téléphone du destinataire est obligatoire"
    });
  }"""

content = content.replace(old_validation, new_validation)

# 3. Ajouter les champs destinataire dans commandeData
old_destinataire = """      // Destinataire
      destinataire_latitude,
      destinataire_longitude,
      destinataire_adresse,"""

new_destinataire = """      // Destinataire
      destinataire_latitude,
      destinataire_longitude,
      destinataire_adresse,
      destinataire_nom: destinataire_nom || null,
      destinataire_email: destinataire_email || null,
      destinataire_contact,"""

content = content.replace(old_destinataire, new_destinataire)

# 4. Supprimer l'envoi du code OTP
old_otp = """    // Envoyer le code de confirmation par email
    if (commande.user_email) {
      await sendDeliveryCodeEmail(
        commande.user_email,
        commande.user_nom,
        commande.user_prenom,
        commande
      );
    }"""

new_otp = """    // ⚠️ CODE OTP SERA ENVOYÉ LORS DE LA RÉCUPÉRATION DU COLIS (pas maintenant)"""

content = content.replace(old_otp, new_otp)

# Sauvegarder
with open('c:/Users/THEWAYNE/kksExpress-backend/controllers/commande/commandeController.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Fichier modifié avec succès !")
print("✅ 1. Champs destinataire ajoutés au destructuring")
print("✅ 2. Validation destinataire_contact ajoutée")
print("✅ 3. Champs destinataire ajoutés à commandeData")
print("✅ 4. Envoi OTP supprimé de createCommande")
