# 🧪 Plan de Test - Système de Livraison KKS Express

Ce document détaille les étapes pour tester le cycle complet d'une livraison, de la création de la commande jusqu'à sa livraison finale, en utilisant la collection Postman mise à jour.

---

## 📋 Prérequis
1.  **Serveur Backend** lancé (`node server.js`).
2.  **Base de données** à jour (avec les nouvelles colonnes `livreur_latitude`, etc.).
3.  **Collection Postman** importée.

---

## 🔄 Scénario Complet de Livraison

### Étape 1 : Authentification
D'abord, connectez-vous avec les différents rôles pour obtenir les tokens.

1.  **Connexion Utilisateur** (`POST /api/auth/user/login`)
    *   Le token sera sauvegardé dans `{{user_token}}`.
2.  **Connexion Livreur** (`POST /api/auth/livreur/login`)
    *   Le token sera sauvegardé dans `{{livreur_token}}`.

---

### Étape 2 : Création de la Commande (Utilisateur)
L'utilisateur crée une commande avec des coordonnées GPS.

*   **Requête** : `POST /api/commandes`
*   **Header** : `Authorization: Bearer {{user_token}}`
*   **Body (JSON)** :
    ```json
    {
        "type_colis": "Document",
        "poids": 1.5,
        "expediteur_adresse": "Abidjan, Cocody",
        "destinataire_adresse": "Abidjan, Marcory",
        "destinataire_latitude": 5.3167,
        "destinataire_longitude": -4.0167,
        "destinataire_nom": "Jane Doe",
        "destinataire_telephone": "0504030201",
        "tarif": 1500
    }
    ```
*   **Résultat attendu** : `201 Created`. Notez la `reference` et l'`id` de la commande créée.

---

### Étape 3 : Vérification des Disponibilités (Livreur)
Le livreur vérifie les commandes disponibles (non assignées).

*   **Requête** : `GET /api/livreur/commandes/disponibles`
*   **Header** : `Authorization: Bearer {{livreur_token}}`
*   **Résultat attendu** : Liste contenant la commande créée à l'étape 2.

---

### Étape 4 : Acceptation de la Commande (Livreur)
Le livreur accepte la commande.

*   **Requête** : `POST /api/livreur/commandes/:id/accepter`
    *   Remplacer `:id` par l'ID de la commande.
*   **Header** : `Authorization: Bearer {{livreur_token}}`
*   **Résultat attendu** : `200 OK`. Le statut de la commande passe à `en_cours`.

---

### Étape 5 : Mise à jour de la Position (Livreur en route)
Le livreur se déplace et met à jour sa position.

*   **Requête** : `POST /api/livreur/commandes/position`
*   **Header** : `Authorization: Bearer {{livreur_token}}`
*   **Body (JSON)** :
    ```json
    {
        "latitude": 5.3400,
        "longitude": -4.0200
    }
    ```
*   **Résultat attendu** : `200 OK`. La position est mise à jour sur le livreur ET sur la commande en cours.

---

### Étape 6 : Suivi de la Commande (Public/Client)
Le client suit sa commande en temps réel.

*   **Requête** : `GET /api/commandes/suivre/:reference`
    *   Remplacer `:reference` par la référence de la commande (ex: `CMD2312...`).
*   **Header** : Aucun (Public).
*   **Résultat attendu** : `200 OK`.
    *   `statut`: "en_cours"
    *   `tracking`: Contient `livreur_position`, `distance_restante_km`, `temps_estime_minutes`.

---

### Étape 7 : Terminer la Livraison (Livreur)
Le livreur arrive et termine la livraison **en fournissant le code OTP**.

*   **Requête** : `PUT /api/livreur/commandes/:id/terminer`
*   **Header** : `Authorization: Bearer {{livreur_token}}`
*   **Body (JSON)** :
    ```json
    {
        "code_confirmation": "XXXX"
    }
    ```
    ⚠️ **Important** : Remplacez `XXXX` par le code reçu par email lors de l'étape 2  
    (Vous le trouverez aussi dans la réponse de la création de commande ou dans la base de données)
    
*   **Résultat attendu** : `200 OK`. Le statut passe à `livree`.
*   **Si le code est incorrect ou manquant** : `400 Bad Request` avec message d'erreur

---

### Étape 8 : Vérification Historique (Livreur)
Le livreur consulte son historique.

*   **Requête** : `GET /api/livreur/commandes/historique`
*   **Header** : `Authorization: Bearer {{livreur_token}}`
*   **Résultat attendu** : La commande apparaît dans la liste avec le statut `livree` et les statistiques mises à jour.

---

## ⚠️ Cas d'Erreur à Tester

1.  **Accepter une commande déjà prise** :
    *   Tenter d'accepter la même commande avec un *autre* livreur.
    *   Attendu : `400 Bad Request`.
2.  **Terminer une commande non commencée** :
    *   Tenter de terminer une commande qui est encore `en_attente`.
    *   Attendu : `400 Bad Request`.
3.  **Position invalide** :
    *   Envoyer une position sans latitude/longitude.
    *   Attendu : `400 Bad Request`.
4.  **Code OTP incorrect** :
    *   Tenter de terminer une livraison avec un mauvais code :
    ```json
    {
        "code_confirmation": "0000"
    }
    ```
    *   Attendu : `400 Bad Request` - "Code de confirmation incorrect".
5.  **Code OTP manquant** :
    *   Tenter de terminer une livraison sans fournir de code.
    *   Attendu : `400 Bad Request` - "Le code de confirmation est requis".
