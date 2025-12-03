# 🔐 Système de Validation par Code OTP - Résumé

## ✅ Modifications Effectuées

### 1. **Modèle `Commande.js`**
- ✅ Ajout du champ `code_confirmation` (VARCHAR(4))

### 2. **Contrôleurs**
- ✅ **`controllers/commande/commandeController.js`**
  - Génération automatique d'un code OTP à 4 chiffres lors de la création de la commande
  
- ✅ **`controllers/livreur/commandeController.js`**
  - Vérification obligatoire du code OTP dans `terminerLivraison`
  - Refus de la livraison si le code est incorrect ou manquant

### 3. **Service Email**
- ✅ Fonction `sendOrderStatusEmail` pour les notifications de changement de statut
- ⚠️ **À AJOUTER MANUELLEMENT** : Fonction `sendDeliveryCodeEmail` pour envoyer le code au client

---

## 📋 Actions Requises pour Finaliser

### Étape 1 : Migration SQL
Exécutez cette commande sur votre base de données MySQL :

```sql
ALTER TABLE commandes 
ADD COLUMN code_confirmation VARCHAR(4) NULL 
COMMENT 'Code OTP pour valider la livraison';
```

### Étape 2 : Ajouter cette fonction dans `utils/emailService.js`

**Ajoutez ce code AVANT le `module.exports` (ligne 507) :**

```javascript
// Envoyer le code de confirmation de livraison au client
const sendDeliveryCodeEmail = async (userEmail, nom, prenom, commande) => {
  try {
    console.log(`📧 Envoi code de livraison à: ${userEmail}`);
    
    const fromEmail = process.env.MAIL_FROM_ADDRESS || 'contact@edemarchee-ci.com';
    const fromName = process.env.SMTP_FROM || 'KKS Express';
    
    const mailOptions = {
      from: {
        name: fromName,
        address: fromEmail
      },
      to: userEmail,
      subject: `🔐 Code de livraison - Commande ${commande.reference}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #2663EB; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
              <h1 style="margin: 0;">KKS Express</h1>
              <p style="margin: 10px 0 0;">Code de confirmation de livraison</p>
            </div>
            
            <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px;">
              <h2 style="color: #2663EB;">Bonjour ${prenom} ${nom},</h2>
              
              <p>Votre commande <strong>${commande.reference}</strong> a été créée avec succès.</p>
              
              <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
                <h3 style="color: #856404; margin-top: 0;">⚠️ Important - Code de livraison</h3>
                <p style="margin: 10px 0;">Voici votre <strong>code de confirmation</strong> à communiquer au livreur lors de la remise de votre colis :</p>
                <div style="text-align: center; font-size: 48px; font-weight: bold; letter-spacing: 10px; color: #2663EB; background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border: 3px solid #2663EB;">
                  ${commande.code_confirmation}
                </div>
                <p style="margin: 10px 0; color: #856404;"><strong>Ne partagez ce code qu'avec le livreur au moment de la livraison.</strong></p>
              </div>
              
              <div style="background-color: white; padding: 15px; border-left: 4px solid #2663EB; margin: 20px 0;">
                <p><strong>Référence de commande :</strong> ${commande.reference}</p>
                <p><strong>Destination :</strong> ${commande.destinataire_adresse}</p>
                <p><strong>Type de colis :</strong> ${commande.type_colis}</p>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 25px;">
                Vous recevrez une notification lorsqu'un livreur acceptera votre commande.
              </p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #999; text-align: center;">
                © ${new Date().getFullYear()} KKS Express. Tous droits réservés.<br>
                Cet email vous a été envoyé automatiquement.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Code de livraison envoyé ! Message ID: ${info.messageId}`);
    return true;
    
  } catch (error) {
    console.error(`💥 Erreur envoi code livraison:`, error.message);
    return false;
  }
};
```

**Ensuite, MODIFIEZ le `module.exports` à la ligne 509 pour ajouter la nouvelle fonction :**

```javascript
module.exports = {
  sendActivationEmail,
  sendWelcomeEmail,
  generateResetToken,
  sendOTPCodeEmail,
  sendOrderStatusEmail,
  sendDeliveryCodeEmail  // ← AJOUTER CETTE LIGNE
};
```

### Étape 3 : Appeler la fonction dans `createCommande`

**Dans `controllers/commande/commandeController.js`, ajoutez cet import en haut :**

```javascript
const { sendDeliveryCodeEmail } = require("../../utils/emailService");
```

**Puis, juste après `const commande = await Commande.create(commandeData);` (ligne 101), ajoutez :**

```javascript
    // Envoyer le code de confirmation par email
    if (commande.user_email) {
      await sendDeliveryCodeEmail(
        commande.user_email,
        commande.user_nom,
        commande.user_prenom,
        commande
      );
    }
```

---

## 🧪 Comment Tester le Code OTP

### Scénario Complet

1. **Créer une commande** (utilisateur)
   - Le client reçoit un email avec le code (ex: `8421`)

2. **Accepter la commande** (livreur)
   - Le livreur prend en charge la commande

3. **Terminer la livraison** (livreur)
   - **AVEC le bon code** :
     ```json
     {
       "code_confirmation": "8421"
     }
     ```
     → ✅ Livraison acceptée
     
   - **SANS code** ou **AVEC un mauvais code** :
     ```json
     {
       "code_confirmation": "0000"
     }
     ```
     → ❌ Erreur : "Code de confirmation incorrect"

---

## 📊 Flux Complet

```
1. Client crée commande
   ↓
2. Code OTP généré (ex: 8421)
   ↓
3. Email envoyé au client avec le code
   ↓
4. Livreur accepte la commande
   ↓
5. Livreur livre le colis
   ↓
6. Livreur demande le code au client
   ↓
7. Livreur saisit le code dans l'app
   ↓
8. Backend vérifie le code
   ↓
9. Si OK → Statut = "livree"
   Si KO → Refus + message d'erreur
```

---

## 🔒 Sécurité Apportée

✅ **Preuve de livraison** : Le livreur doit être physiquement face au client pour obtenir le code

✅ **Anti-fraude** : Impossible de marquer une livraison comme terminée sans le code

✅ **Traçabilité** : Le code est unique par commande

✅ **Simplicité** : Code à 4 chiffres facile à communiquer

---

## 📝 Notes Importantes

- Le code est généré lors de la **création de la commande**
- Le code est envoyé par **email au client**
- Le code est **requis** pour terminer la livraison
- Le code est **stocké en clair** dans la base (acceptable car non sensible)
