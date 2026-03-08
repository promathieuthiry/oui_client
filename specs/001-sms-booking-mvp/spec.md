# Feature Specification: Confirmation de Réservation par SMS — MVP

**Feature Branch**: `001-sms-booking-mvp`
**Created**: 2026-03-08
**Status**: Draft
**Input**: User description: "Restaurant booking confirmation via SMS — import bookings, send confirmation SMS the day before, capture OUI/NON replies, email recap to restaurant before service. MVP, test to a phone number, operational quickly."

## Clarifications

### Session 2026-03-08

- Q: Comment associer une réponse SMS à une réservation quand un même numéro a plusieurs réservations en attente ? → A: La réponse s'applique à toutes les réservations en attente pour ce numéro (confirmation groupée).
- Q: Quelle clé d'unicité pour la déduplication à l'import ? → A: Téléphone + date + heure + restaurant (chaque créneau est distinct).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Envoyer un SMS de confirmation et recevoir une réponse (Priority: P1)

L'opérateur importe les réservations d'un restaurant, déclenche manuellement l'envoi des SMS de confirmation, et voit le statut de livraison de chaque SMS. Le client reçoit un SMS lui demandant de confirmer sa réservation en répondant OUI ou NON. L'opérateur consulte ensuite les réponses reçues dans le tableau de bord.

**Why this priority**: C'est le coeur du produit — la boucle complète SMS aller-retour. Sans cela, rien d'autre n'a de valeur. Permet aussi de tester immédiatement avec son propre numéro de téléphone.

**Independent Test**: Importer un fichier CSV contenant une seule réservation avec le numéro de téléphone de l'opérateur, déclencher l'envoi, recevoir le SMS, répondre OUI, vérifier que la réponse apparaît dans le tableau de bord.

**Acceptance Scenarios**:

1. **Given** un fichier CSV contenant des réservations (nom, téléphone, date, heure, nombre de couverts), **When** l'opérateur l'importe via l'interface, **Then** les réservations apparaissent dans la liste avec le statut « En attente ».
2. **Given** des réservations importées pour demain, **When** l'opérateur clique sur « Envoyer les SMS », **Then** un écran de confirmation affiche le nombre de SMS qui seront envoyés et les numéros de téléphone concernés.
3. **Given** l'opérateur confirme l'envoi, **When** les SMS sont envoyés, **Then** chaque réservation affiche son statut de livraison (envoyé, échoué) dans le tableau de bord.
4. **Given** un SMS envoyé à un client, **When** le client répond « OUI » (ou « oui », « Oui! », « oui. »), **Then** la réservation passe au statut « Confirmée ».
5. **Given** un SMS envoyé à un client, **When** le client répond « NON » (ou « non », « Non merci »), **Then** la réservation passe au statut « Annulée ».
6. **Given** un SMS envoyé à un client, **When** le client répond un message non interprétable (ex. « peut-être », « je sais pas »), **Then** la réservation passe au statut « Réponse à vérifier » et l'opérateur est notifié.
7. **Given** un envoi de SMS échoué, **When** le système détecte l'échec, **Then** l'envoi est retenté automatiquement (jusqu'à 3 fois) et l'opérateur voit le statut « Échec » si toutes les tentatives échouent.

---

### User Story 2 — Recevoir le récapitulatif par email avant le service (Priority: P2)

L'opérateur génère un email récapitulatif listant toutes les réservations du jour avec leur statut de confirmation (confirmée, annulée, en attente, réponse à vérifier). Cet email est envoyé à l'adresse du restaurant. Le récapitulatif est envoyable manuellement (MVP) pour vérification avant le service.

**Why this priority**: Le récapitulatif est le livrable final pour le restaurant. Sans lui, l'opérateur devrait transmettre les informations manuellement.

**Independent Test**: Après avoir importé des réservations et reçu quelques réponses, déclencher l'envoi du récapitulatif et vérifier que l'email reçu contient la liste complète des réservations avec les bons statuts.

**Acceptance Scenarios**:

1. **Given** des réservations existent pour aujourd'hui avec différents statuts, **When** l'opérateur clique sur « Envoyer le récapitulatif », **Then** un email est envoyé à l'adresse du restaurant contenant la liste de toutes les réservations du jour.
2. **Given** un récapitulatif envoyé, **When** le restaurant ouvre l'email, **Then** il voit pour chaque réservation : le nom du client, l'heure, le nombre de couverts, et le statut (Confirmée, Annulée, En attente, À vérifier).
3. **Given** aucune réponse n'a été reçue, **When** l'opérateur envoie le récapitulatif, **Then** l'email est quand même envoyé avec toutes les réservations au statut « En attente ».
4. **Given** un récapitulatif a déjà été envoyé pour ce jour et ce restaurant, **When** l'opérateur relance l'envoi, **Then** un nouveau récapitulatif mis à jour est envoyé (pas de blocage).

---

### User Story 3 — Envoi automatique quotidien (Priority: P3)

Le système envoie automatiquement les SMS de confirmation la veille de chaque réservation et le récapitulatif le matin du jour de la réservation, sans intervention manuelle. L'opérateur peut vérifier dans le tableau de bord que les envois automatiques se sont bien déroulés.

**Why this priority**: L'automatisation élimine le besoin d'intervention quotidienne. Sans elle, un opérateur doit se connecter chaque jour pour déclencher les envois manuellement. Mais le MVP fonctionne déjà avec les déclenchements manuels (P1 + P2).

**Independent Test**: Importer des réservations pour le lendemain et pour le jour même. Vérifier que le système envoie les SMS automatiquement la veille et le récapitulatif le matin du jour J.

**Acceptance Scenarios**:

1. **Given** des réservations existent pour demain, **When** l'heure d'envoi automatique est atteinte (par défaut 18h la veille), **Then** les SMS de confirmation sont envoyés automatiquement à tous les clients concernés.
2. **Given** des réservations existent pour aujourd'hui, **When** l'heure d'envoi du récapitulatif est atteinte (par défaut 10h le matin), **Then** l'email récapitulatif est envoyé automatiquement au restaurant.
3. **Given** l'envoi automatique a déjà eu lieu pour un ensemble de réservations, **When** le processus se relance (par ex. après un redémarrage), **Then** aucun doublon n'est créé — les SMS déjà envoyés ne sont pas renvoyés.
4. **Given** l'envoi automatique échoue, **When** l'opérateur se connecte, **Then** il voit un indicateur clair de l'échec et peut relancer l'envoi manuellement.

---

### User Story 4 — Import flexible avec mapping de colonnes (Priority: P4)

Chaque restaurant fournit ses réservations dans un format CSV différent. L'opérateur configure le mapping entre les colonnes du fichier CSV et les champs attendus (nom, téléphone, date, heure, couverts). Ce mapping est sauvegardé pour réutilisation future. Le ré-import d'un même fichier met à jour les réservations existantes sans créer de doublons.

**Why this priority**: La flexibilité d'import est essentielle pour supporter plusieurs restaurants, mais le MVP peut fonctionner avec un format CSV fixe pour le premier restaurant.

**Independent Test**: Importer un CSV avec des colonnes non-standard, configurer le mapping, sauvegarder, puis ré-importer un fichier modifié et vérifier que les réservations sont mises à jour.

**Acceptance Scenarios**:

1. **Given** un fichier CSV avec des noms de colonnes non-standard, **When** l'opérateur l'importe, **Then** l'interface propose de mapper chaque colonne du fichier vers les champs attendus (nom, téléphone, date, heure, couverts).
2. **Given** un mapping de colonnes configuré pour un restaurant, **When** l'opérateur sauvegarde le mapping, **Then** le mapping est réutilisé automatiquement lors du prochain import pour ce restaurant.
3. **Given** un fichier CSV contenant une réservation déjà importée (même numéro de téléphone + même date + même heure + même restaurant), **When** l'opérateur ré-importe le fichier, **Then** la réservation existante est mise à jour (pas de doublon créé).
4. **Given** un fichier CSV contenant des erreurs (numéro de téléphone invalide, date passée, champ obligatoire manquant), **When** l'opérateur l'importe, **Then** les lignes invalides sont listées avec la raison de l'erreur, et les lignes valides sont importées normalement.

---

### Edge Cases

- Que se passe-t-il si un client répond plusieurs fois (ex. d'abord NON puis OUI) ? La dernière réponse fait foi et le statut est mis à jour.
- Que se passe-t-il si un SMS est envoyé à un numéro invalide ? L'envoi échoue, les tentatives sont épuisées, et la réservation affiche « Échec d'envoi » avec le numéro concerné.
- Que se passe-t-il si le fichier CSV est vide ou ne contient que des en-têtes ? Un message d'erreur clair est affiché : « Aucune réservation trouvée dans le fichier ».
- Que se passe-t-il si deux réservations ont le même numéro de téléphone pour le même jour ? Chaque réservation est traitée indépendamment avec un SMS distinct. Lorsque le client répond (OUI/NON), la réponse s'applique à toutes les réservations en attente pour ce numéro (confirmation groupée).
- Que se passe-t-il si l'opérateur tente d'envoyer des SMS pour des réservations dont la date est déjà passée ? Le système empêche l'envoi et affiche un avertissement.
- Que se passe-t-il si le service d'envoi de SMS est indisponible ? L'opérateur voit un message d'erreur clair et peut retenter plus tard.
- Que se passe-t-il si l'opérateur importe des réservations pendant qu'un envoi automatique est en cours ? L'import se déroule normalement ; les nouvelles réservations seront incluses dans le prochain cycle d'envoi.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système DOIT permettre à l'opérateur d'importer des réservations depuis un fichier CSV via l'interface web.
- **FR-002**: Le système DOIT valider chaque ligne importée (format de téléphone, date future, champs obligatoires présents) et signaler les erreurs ligne par ligne.
- **FR-003**: Le système DOIT envoyer un SMS de confirmation à chaque client la veille de sa réservation, contenant le nom du restaurant, la date, l'heure, et une invitation à répondre OUI ou NON.
- **FR-004**: Le système DOIT capturer les réponses SMS des clients et mettre à jour le statut de la réservation (Confirmée, Annulée, À vérifier). Le matching se fait par numéro de téléphone : une réponse s'applique à toutes les réservations en attente pour ce numéro.
- **FR-005**: Le système DOIT interpréter les variations de réponse (majuscules/minuscules, ponctuation, espaces, formulations comme « oui merci », « non désolé ») et classer en OUI, NON, ou indéterminé.
- **FR-006**: Le système DOIT permettre à l'opérateur de déclencher manuellement l'envoi des SMS et du récapitulatif depuis l'interface.
- **FR-007**: Le système DOIT envoyer un email récapitulatif au restaurant listant toutes les réservations du jour avec leur statut de confirmation.
- **FR-008**: Le système DOIT retenter l'envoi d'un SMS échoué jusqu'à 3 fois avant de marquer la réservation en échec.
- **FR-009**: Le système DOIT supporter l'envoi automatique quotidien des SMS (veille) et du récapitulatif (matin du jour J) sans intervention manuelle.
- **FR-010**: L'envoi automatique DOIT être idempotent — un SMS ne doit jamais être envoyé deux fois pour la même réservation.
- **FR-011**: Le système DOIT permettre la configuration du mapping de colonnes CSV par restaurant et sauvegarder ce mapping.
- **FR-012**: Le ré-import d'un fichier CSV DOIT mettre à jour les réservations existantes sans créer de doublons (idempotence de l'import). La clé d'unicité est : numéro de téléphone + date + heure + restaurant.
- **FR-013**: Le système DOIT stocker les numéros de téléphone au format international et les masquer dans les journaux et affichages non-essentiels.
- **FR-014**: Toutes les données de réservation DOIVENT être cloisonnées par restaurant.
- **FR-015**: Le système DOIT afficher tous les messages d'erreur et textes de l'interface en français, sans jargon technique.
- **FR-016**: Le système DOIT permettre à l'opérateur de se connecter via un identifiant et mot de passe.
- **FR-017**: Le contenu du SMS DOIT être configurable par restaurant (template avec variables : nom du restaurant, date, heure, nombre de couverts).

### Key Entities

- **Restaurant** : Établissement client du service. Attributs principaux : nom, adresse email pour le récapitulatif, template SMS, mapping CSV sauvegardé.
- **Réservation (Booking)** : Une réservation individuelle pour un restaurant. Attributs : nom du client, numéro de téléphone, date, heure, nombre de couverts, statut de confirmation (en attente, confirmée, annulée, à vérifier, échec d'envoi). Appartient à un restaurant. Unicité : téléphone + date + heure + restaurant.
- **Envoi SMS (SMS Send)** : Trace d'un SMS envoyé pour une réservation. Attributs : statut de livraison, nombre de tentatives, horodatage de chaque tentative. Lié à une réservation.
- **Réponse SMS (SMS Reply)** : Réponse reçue d'un client. Attributs : contenu brut du message, interprétation (OUI/NON/indéterminé), horodatage. Liée à une réservation.
- **Récapitulatif (Recap)** : Email récapitulatif envoyé à un restaurant. Attributs : date du service, liste des réservations incluses, horodatage d'envoi, statut de livraison email.

### Assumptions

- Le système est opéré par 2 co-fondateurs uniquement (pas de multi-utilisateurs au-delà de 2 comptes).
- Les restaurants ne se connectent pas au système — ils reçoivent uniquement l'email récapitulatif.
- Le format CSV est le mode d'import principal pour le MVP. L'import via API est hors scope MVP.
- Le template SMS par défaut est en français : « Bonjour, votre réservation au {restaurant} le {date} à {heure} pour {couverts} personne(s) est bien notée. Merci de confirmer en répondant OUI ou NON à ce SMS. »
- L'heure d'envoi automatique des SMS est 18h la veille (configurable). L'heure d'envoi du récapitulatif est 10h le matin du jour J (configurable).
- L'authentification est simple (email/mot de passe) pour les 2 opérateurs. Pas de système de rôles.
- La rétention des données est de 90 jours, après quoi les données sont purgées ou anonymisées.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un opérateur peut importer un fichier CSV et envoyer les SMS de confirmation en moins de 5 minutes pour un batch de 50 réservations.
- **SC-002**: 95 % des SMS envoyés sont livrés au premier essai (hors numéros invalides).
- **SC-003**: Les réponses OUI/NON des clients sont correctement interprétées dans 99 % des cas (variations de casse, ponctuation, formulations courantes).
- **SC-004**: Le restaurant reçoit l'email récapitulatif avec un taux de fiabilité de 100 % — même si aucune réponse client n'a été reçue.
- **SC-005**: Un opérateur non-technique peut effectuer toutes les opérations quotidiennes (import, envoi, consultation) sans aide technique et sans accès à un terminal.
- **SC-006**: Le système est opérationnel (premier envoi réel) dans un délai de 2 semaines après le début du développement.
- **SC-007**: Le ré-import d'un même fichier CSV ne produit aucun doublon — le nombre de réservations reste identique.
