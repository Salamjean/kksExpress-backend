import json

# Charger le fichier JSON
with open('c:/Users/THEWAYNE/kksExpress-backend/kksExpress_Postman_Collection_Updated.json', 'r', encoding='utf-8') as f:
    collection = json.load(f)

# Trouver la section "Livreur"
for section in collection['item']:
    if 'Livreur' in section['name']:
        # Trouver l'index de "Accepter Commande"
        accepter_index = None
        for i, item in enumerate(section['item']):
            if item['name'] == 'Accepter Commande':
                accepter_index = i
                break
        
        if accepter_index is not None:
            # Créer les 2 nouvelles requêtes
            recuperer_colis = {
                "name": "Récupérer Colis ⭐ NOUVEAU",
                "request": {
                    "method": "POST",
                    "header": [
                        {
                            "key": "Authorization",
                            "value": "Bearer {{livreur_token}}",
                            "type": "text"
                        }
                    ],
                    "url": {
                        "raw": "{{base_url}}/api/livreur/commandes/:id/recuperer",
                        "host": ["{{base_url}}"],
                        "path": ["api", "livreur", "commandes", ":id", "recuperer"],
                        "variable": [
                            {
                                "key": "id",
                                "value": "1"
                            }
                        ]
                    },
                    "description": "📦 Statut → recuperee | 🔐 Génère + Envoie code OTP à l'expéditeur ET au destinataire"
                },
                "response": []
            }
            
            demarrer_livraison = {
                "name": "Démarrer Livraison ⭐ NOUVEAU",
                "request": {
                    "method": "POST",
                    "header": [
                        {
                            "key": "Authorization",
                            "value": "Bearer {{livreur_token}}",
                            "type": "text"
                        }
                    ],
                    "url": {
                        "raw": "{{base_url}}/api/livreur/commandes/:id/demarrer-livraison",
                        "host": ["{{base_url}}"],
                        "path": ["api", "livreur", "commandes", ":id", "demarrer-livraison"],
                        "variable": [
                            {
                                "key": "id",
                                "value": "1"
                            }
                        ]
                    },
                    "description": "🚚 Statut → en_cours | 📍 Active le tracking GPS | Email: 'Livreur en route vers vous'"
                },
                "response": []
            }
            
            # Insérer après "Accepter Commande"
            section['item'].insert(accepter_index + 1, recuperer_colis)
            section['item'].insert(accepter_index + 2, demarrer_livraison)
            print(f"✅ Ajouté 2 nouvelles requêtes après 'Accepter Commande' dans {section['name']}")
            break

# Sauvegarder
with open('c:/Users/THEWAYNE/kksExpress-backend/kksExpress_Postman_Collection_Updated.json', 'w', encoding='utf-8') as f:
    json.dump(collection, f, indent=4, ensure_ascii=False)

print("✅ Fichier mis à jour avec succès !")
