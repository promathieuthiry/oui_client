# OuiClient – Features & Priorités Produit

## Existant (validé ✅)

- Import CSV + parsing colonnes (heure, téléphone, nom, statut)
- Normalisation téléphone (06 / +33 / 0033)
- Création réservations avec statut "À envoyer"
- Envoi SMS J-1 via Octopush (sélection manuelle + choix template)
- Réception réponses clients + mise à jour statuts
- Statuts : À envoyer → SMS envoyé → Confirmée / Annulée / À vérifier / Échec
- Dashboard avec compteurs
- Ajout manuel de réservation
- Template confirmation J-1

---

## 🔴 P0 – Bug critique

### Fix délai envoi SMS
- **Problème** : SMS envoyés avec 15 min à 1h de délai au lieu de quelques secondes
- **Actions** :
  - Vérifier mode API Octopush (transactionnel vs campagne)
  - Vérifier file d'attente / priorité SMS
  - Objectif : envoi en quelques secondes

---

## 🟠 P1 – Features manquantes essentielles

### 1. Distinction service midi / soir
- Règle : heure < 15h → midi, heure ≥ 17h → soir
- Affectation automatique du service à chaque réservation
- Utilisé pour : relances, envois, filtres, reporting

### 2. Fonction relance automatique
- **Logique métier** :
  - Relancer uniquement : statut = "SMS envoyé" ET aucune réponse
  - Ne jamais relancer : Confirmée, Annulée, À vérifier
  - Horaires : relance midi → 9h, relance soir → 15h
- **Interface** :
  - Bouton "Relancer service midi"
  - Bouton "Relancer service soir"
  - Affichage nombre de clients concernés
  - Sélection auto des réservations + application template relance

### 3. Protection double envoi
- Empêcher l'envoi du même template plusieurs fois pour une même réservation
- Confirmation envoyée 1 fois max, relance envoyée 1 fois max
- Traçabilité : quel template envoyé, date/heure d'envoi

### 4. Protection doublons import
- Si réservation existe déjà avec même (date + heure + téléphone) → ne pas recréer
- Gestion réimport du même fichier

### 5. Récapitulatif avant service
- **Envoi par email** au restaurant
- Horaires : 10h30 → récap midi, 17h30 → récap soir
- Contenu :
  - Compteurs : Confirmées / À vérifier / Sans réponse
  - Liste détaillée triée par heure : Nom – heure – couverts
- Format HTML avec blocs par statut + couleurs

---

## 🟡 P2 – Améliorations importantes

### 6. Templates SMS modifiables
- Modifier les templates depuis l'interface
- Types : confirmation J-1, relance, réservation tardive
- Création de nouveaux templates
- A/B testing futur

### 7. Amélioration parsing réponses SMS
- **Confirmations** : OK, Oui, Je confirme, Confirmé
- **Annulations** : Annuler, Non, Je ne viens pas
- **Autres** → statut "À vérifier"
- Compléter la liste de mots-clés reconnus

### 8. Mapping réponse ↔ réservation
- Association réponse par numéro de téléphone (à confirmer)
- Vérification mapping date/heure
- Gestion multiples réservations même client même jour

### 9. Actions visibles par statut dans l'interface
| Statut | Action |
|---|---|
| À envoyer | Envoyer SMS |
| SMS envoyé | Relancer |
| Confirmée | Aucune |
| À vérifier | Vérifier |

---

## 🔵 P3 – UX & améliorations futures

### 10. Améliorations UX
- Mise à jour automatique des statuts (actuellement 2-3 min + refresh manuel)
- Refresh automatique de l'interface
- Logs d'envoi complets
- Vérification anomalies

### 11. Nettoyage import
- Nettoyage lignes inutiles du CSV
- Ignorer statuts Asterio (Annulé / Présent / Parti)

### 12. Réservations tardives
- Logique traitement tardif au point 17h30
- Pas d'automatisation nécessaire pour MVP

### 13. Paramétrage futur
- Horaires configurables (services, relances, récaps)
- Templates configurables
- Passage progressif de manuel → automatique
