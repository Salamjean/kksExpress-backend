-- ================================================================
-- MIGRATION SQL : Refactoring du Système de Statuts de Livraison
-- Date: 2024-12-04
-- ================================================================

-- ================================================================
-- ÉTAPE 1 : Modifier l'ENUM statut
-- ================================================================
-- Ajouter les nouveaux statuts: 'acceptee' et 'recuperee'
-- Supprimer le statut 'confirmee' qui n'est plus utilisé
ALTER TABLE commandes 
MODIFY COLUMN statut ENUM(
  'en_attente', 
  'acceptee',      -- NOUVEAU: Livreur a accepté, va récupérer le colis
  'recuperee',     -- NOUVEAU: Livreur a récupéré le colis
  'en_cours',      -- Livreur est en route vers le destinataire
  'livree', 
  'annulee'
) DEFAULT 'en_attente';

-- ================================================================
-- ÉTAPE 2 : Ajouter les champs destinataire
-- ================================================================
ALTER TABLE commandes 
ADD COLUMN destinataire_nom VARCHAR(100) NULL 
COMMENT 'Nom du destinataire',
ADD COLUMN destinataire_contact VARCHAR(20) NULL 
COMMENT 'Téléphone du destinataire',
ADD COLUMN destinataire_email VARCHAR(100) NULL 
COMMENT 'Email du destinataire';

-- ================================================================
-- ÉTAPE 3 : Ajouter les nouveaux champs de timestamp
-- ================================================================
ALTER TABLE commandes 
ADD COLUMN date_recuperation DATETIME NULL 
COMMENT 'Date à laquelle le livreur a récupéré le colis',
ADD COLUMN date_debut_livraison DATETIME NULL 
COMMENT 'Date à laquelle le livreur a commencé la livraison vers le destinataire';

-- ================================================================
-- ÉTAPE 4 (OPTIONNELLE) : Migration des données existantes
-- ================================================================
-- Si vous avez des commandes avec le statut 'confirmee', elles doivent être migrées
-- UPDATE commandes SET statut = 'en_attente' WHERE statut = 'confirmee';

-- Les commandes actuellement 'en_cours' peuvent rester telles quelles
-- Ou vous pouvez choisir de les mettre en 'recuperee' si elles n'ont pas encore démarré la livraison

-- ================================================================
-- VÉRIFICATION
-- ================================================================
-- Vérifiez que toutes les modifications sont bien appliquées
SELECT 
  COLUMN_NAME, 
  DATA_TYPE, 
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'commandes' 
  AND TABLE_SCHEMA = DATABASE()
  AND COLUMN_NAME IN (
    'statut',
    'destinataire_nom',
    'destinataire_contact', 
    'destinataire_email',
    'date_recuperation',
    'date_debut_livraison'
  )
ORDER BY ORDINAL_POSITION;
