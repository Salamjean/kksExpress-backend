# ⚠️ INSTRUCTION MANUELLE : Ajout des Nouveaux Statuts dans emailService.js

## Fichier à Modifier
`c:\Users\THEWAYNE\kksExpress-backend\utils\emailService.js`

## Ligne à Modifier
Cherchez la fonction `sendOrderStatusEmail` (vers ligne 397) et trouvez le `switch (commande.statut)` (vers ligne 410).

## Code à AJOUTER

**AVANT** le case `'en_cours':`, ajoutez ces deux nouveaux cases :

```javascript
      case 'acceptee':
        subject = `✅ Commande ${commande.reference} acceptée`;
        messageTitle = 'Livreur en route pour récupérer votre colis';
        messageBody = `
          <p>Bonne nouvelle ! Un livreur a accepté votre commande <strong>${commande.reference}</strong>.</p>
          <div style="background-color: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Livreur :</strong> ${commande.livreur_prenom} ${commande.livreur_nom}</p>
            <p><strong>Téléphone :</strong> ${commande.livreur_telephone}</p>
          </div>
          <p>Le livreur va se rendre à l'adresse de récupération pour prendre en charge votre colis.</p>
        `;
        color = '#17a2b8'; // Cyan
        break;

      case 'recuperee':
        subject = `📦 Colis récupéré - ${commande.reference}`;
        messageTitle = 'Votre colis a été récupéré';
        messageBody = `
          <p>Le livreur a récupéré votre colis <strong>${commande.reference}</strong>.</p>
          <p>Il démarrera la livraison vers le destinataire dès que possible.</p>
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p><strong>📍 Important :</strong> Vous recevrez une notification lorsque le livreur sera en route vers le destinataire.</p>
          </div>
        `;
        color = '#6c757d'; // Gris
        break;
```

## Vérification

Après l'ajout, votre switch devrait ressembler à :

```javascript
switch (commande.statut) {
  case 'acceptee':      // ← NOUVEAU
    // ...
    break;
    
  case 'recuperee':     // ← NOUVEAU
    // ...
    break;
    
  case 'en_cours':      // ← EXISTANT
    // ...
    break;
    
  case 'livree':        // ← EXISTANT
    // ...
    break;
    
  case 'annulee':       // ← EXISTANT
    //...
    break;
}
```

## Note Importante

✅ La fonction `sendDeliveryCodeEmail` existe DÉJÀ dans le fichier (ligne 509+)  
✅ Elle est DÉJÀ exportée dans le `module.exports`

Donc vous n'avez QUE les 2 nouveaux cases à ajouter dans le switch !
