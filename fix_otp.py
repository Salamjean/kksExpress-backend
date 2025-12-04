import re

# Lire le fichier
with open('c:/Users/THEWAYNE/kksExpress-backend/controllers/commande/commandeController.js', 'r', encoding='utf-8') as f:
    content = f.read()

print("🔍 Corrections en cours...")

# 1. RETIRER l'import de sendDeliveryCodeEmail (ligne 4)
old_import = 'const { sendDeliveryCodeEmail } = require("../../utils/emailService");'
new_import = '// const { sendDeliveryCodeEmail } = require("../../utils/emailService"); // Utilisé dans recupererColis seulement'

if old_import in content:
    content = content.replace(old_import, new_import)
    print("✅ 1. Import sendDeliveryCodeEmail retiré")
else:
    print("⚠️  1. Import déjà modifié ou introuvable")

# 2. RETIRER complètement le commentaire OTP et ne garder QUE le return
old_section = """    // Créer la commande
    const commande = await Commande.create(commandeData);

    // ⚠️ CODE OTP SERA ENVOYÉ LORS DE LA RÉCUPÉRATION DU COLIS (pas maintenant)

    return res.status(201).json({"""

new_section = """    // Créer la commande
    const commande = await Commande.create(commandeData);

    console.log(`✅ Commande créée: ${commande.reference}`);

    return res.status(201).json({"""

if old_section in content:
    content = content.replace(old_section, new_section)
    print("✅ 2. Section OTP nettoyée")
else:
    print("⚠️  2. Section introuvable, recherche alternative...")
    # Essayer une variante
    alt_section = """    // Créer la commande
    const commande = await Commande.create(commandeData);

    // ⚠️ CODE OTP SERA ENVOYÉ LORS DE LA RÉCUPÉRATION DU COLIS (pas maintenant)"""
    
    if alt_section in content:
        content = content.replace(alt_section, """    // Créer la commande
    const commande = await Commande.create(commandeData);

    console.log(`✅ Commande créée: ${commande.reference}`);""")
        print("✅ 2. Section OTP nettoyée (variante)")

# Sauvegarder
with open('c:/Users/THEWAYNE/kksExpress-backend/controllers/commande/commandeController.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✅ Fichier commandeController.js corrigé !")
print("📧 Le mail OTP ne sera plus envoyé lors de la création")
print("📧 Le code OTP sera envoyé SEULEMENT lors de recupererColis")
