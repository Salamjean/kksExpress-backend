// utils/geoUtils.js
// Utilitaires pour calculs géographiques

/**
 * Calcule la distance entre deux points GPS en kilomètres
 * Utilise la formule de Haversine
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Rayon de la Terre en km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance; // Distance en km
}

/**
 * Convertit des degrés en radians
 */
function toRad(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Estime le temps de trajet en minutes
 * Vitesse moyenne : 30 km/h en ville (moto)
 */
function estimateDeliveryTime(distanceKm) {
    const VITESSE_MOYENNE = 30; // km/h
    const tempsHeures = distanceKm / VITESSE_MOYENNE;
    const tempsMinutes = Math.ceil(tempsHeures * 60);

    return tempsMinutes;
}

/**
 * Formate le temps estimé en texte lisible
 */
function formatEstimatedTime(minutes) {
    if (minutes < 1) {
        return "Moins d'une minute";
    } else if (minutes === 1) {
        return "1 minute";
    } else if (minutes < 60) {
        return `${minutes} minutes`;
    } else {
        const heures = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (mins === 0) {
            return `${heures} heure${heures > 1 ? 's' : ''}`;
        }
        return `${heures}h${mins}`;
    }
}

/**
 * Obtient le statut en français
 */
function getStatutFrancais(statut) {
    const statuts = {
        'en_attente': 'En attente de livreur',
        'confirmee': 'Confirmée',
        'en_cours': 'En cours de livraison',
        'livree': 'Livrée',
        'annulee': 'Annulée'
    };
    return statuts[statut] || statut;
}

module.exports = {
    calculateDistance,
    estimateDeliveryTime,
    formatEstimatedTime,
    getStatutFrancais
};
