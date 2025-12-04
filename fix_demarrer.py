import re

# Lire le fichier
with open('c:/Users/THEWAYNE/kksExpress-backend/controllers/livreur/commandeController.js', 'r', encoding='utf-8') as f:
    content = f.read()

print("🔧 Correction du fichier cassé...")

# Trouver et corriger la section demarrerLivraison corrompue
# La section corrompue commence à "statut: 'en_cours'," et va jusqu'à "} catch"

corrupted_section = """      statut: 'en_cours',
      id: commande.id,
      reference: commande.reference,
      statut: commande.statut,
      destinataire_adresse: commande.destinataire_adresse,
      date_debut_livraison: commande.date_debut_livraison
    }
    });

  } catch (error) {"""

correct_section = """      statut: 'en_cours',
      date_debut_livraison: new Date()
    });

    console.log(`🚚 Livraison démarrée: ${commande.reference}`);

    // Envoyer notification au client (expéditeur)
    if (commande.user_email) {
      await sendOrderStatusEmail(
        commande.user_email,
        commande.user_nom,
        commande.user_prenom,
        commande
      );
    }

    // Envoyer notification au destinataire
    if (commande.destinataire_email) {
      await sendOrderStatusEmail(
        commande.destinataire_email,
        commande.destinataire_nom || 'Destinataire',
        '',
        commande
      );
    }

    return res.status(200).json({
      success: true,
      message: "Livraison démarrée. En route vers le destinataire.",
      commande: {
        id: commande.id,
        reference: commande.reference,
        statut: commande.statut,
        destinataire_adresse: commande.destinataire_adresse,
        date_debut_livraison: commande.date_debut_livraison
      }
    });

  } catch (error) {"""

if corrupted_section in content:
    content = content.replace(corrupted_section, correct_section)
    print("✅ Section demarrerLivraison corrigée")
else:
    print("⚠️ Section corrompue non trouvée, fichier peut-être déjà corrigé")

# Sauvegarder
with open('c:/Users/THEWAYNE/kksExpress-backend/controllers/livreur/commandeController.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✅ Fichier réparé !")
print("✅ Email au destinataire ajouté lors du démarrage de la livraison")
