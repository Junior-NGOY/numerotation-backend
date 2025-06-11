# API de Gestion des Véhicules

Cette API REST permet la gestion complète d'un système d'enregistrement de véhicules avec authentification, gestion des propriétaires, véhicules, documents et audit.

## Structure du Projet

```
backend/
├── src/
│   ├── controllers/     # Contrôleurs pour chaque entité
│   ├── middleware/      # Middlewares (auth, validation, upload)
│   ├── routes/          # Définition des routes
│   ├── utils/           # Utilitaires (audit, etc.)
│   └── db/              # Configuration de la base de données
├── prisma/              # Schéma et migrations Prisma
└── uploads/             # Dossier pour les fichiers uploadés
```

## Installation

1. **Installer les dépendances :**
```bash
npm install
```

2. **Configurer les variables d'environnement :**
```bash
cp .env.example .env
# Éditer le fichier .env avec vos configurations
```

3. **Configurer la base de données :**
```bash
npx prisma migrate dev
npx prisma generate
```

4. **Démarrer le serveur :**
```bash
npm run dev
```

## API Endpoints

### Authentification
- `POST /api/v1/users/register` - Inscription d'un utilisateur
- `POST /api/v1/users/login` - Connexion

### Utilisateurs
- `GET /api/v1/users` - Liste des utilisateurs (Admin uniquement)
- `GET /api/v1/users/:id` - Détails d'un utilisateur
- `PUT /api/v1/users/:id` - Modifier un utilisateur
- `DELETE /api/v1/users/:id` - Supprimer un utilisateur (Admin uniquement)
- `PUT /api/v1/users/:id/password` - Changer le mot de passe

### Propriétaires
- `POST /api/v1/proprietaires` - Créer un propriétaire
- `GET /api/v1/proprietaires` - Liste des propriétaires
- `GET /api/v1/proprietaires/:id` - Détails d'un propriétaire
- `PUT /api/v1/proprietaires/:id` - Modifier un propriétaire
- `DELETE /api/v1/proprietaires/:id` - Supprimer un propriétaire (Admin uniquement)
- `GET /api/v1/proprietaires/stats` - Statistiques des propriétaires

### Véhicules
- `POST /api/v1/vehicules` - Créer un véhicule
- `GET /api/v1/vehicules` - Liste des véhicules
- `GET /api/v1/vehicules/:id` - Détails d'un véhicule
- `PUT /api/v1/vehicules/:id` - Modifier un véhicule
- `DELETE /api/v1/vehicules/:id` - Supprimer un véhicule (Admin uniquement)
- `GET /api/v1/vehicules/stats` - Statistiques des véhicules

### Documents
- `POST /api/v1/documents/upload` - Uploader un document
- `POST /api/v1/documents/upload-multiple` - Uploader plusieurs documents
- `GET /api/v1/documents` - Liste des documents
- `GET /api/v1/documents/:id` - Détails d'un document
- `GET /api/v1/documents/:id/download` - Télécharger un document
- `PUT /api/v1/documents/:id` - Modifier un document
- `DELETE /api/v1/documents/:id` - Supprimer un document (Admin uniquement)
- `GET /api/v1/documents/stats` - Statistiques des documents

### Audit
- `GET /api/v1/audit` - Logs d'audit (Admin uniquement)
- `GET /api/v1/audit/:id` - Détails d'un log d'audit (Admin uniquement)
- `GET /api/v1/audit/record/:table/:recordId` - Logs pour un enregistrement spécifique
- `GET /api/v1/audit/stats` - Statistiques d'audit (Admin uniquement)
- `POST /api/v1/audit/purge` - Purger les anciens logs (Admin uniquement)
- `GET /api/v1/audit/export` - Exporter les logs d'audit (Admin uniquement)

### Dashboard
- `GET /api/v1/dashboard/stats` - Statistiques du tableau de bord
- `GET /api/v1/dashboard/entity/:entity` - Statistiques détaillées d'une entité
- `GET /api/v1/dashboard/performance` - Métriques de performance (Admin uniquement)

### Système
- `GET /health` - Vérification de l'état du serveur

## Authentification

L'API utilise JWT (JSON Web Tokens) pour l'authentification. Après connexion, incluez le token dans l'en-tête Authorization :

```
Authorization: Bearer <votre-token-jwt>
```

## Rôles

- **USER** : Accès de base (lecture, création, modification de ses propres données)
- **ADMIN** : Accès complet (suppression, gestion des utilisateurs, audit)

## Pagination

Les endpoints de liste supportent la pagination :

```
GET /api/v1/proprietaires?page=1&limit=10&search=nom&sortBy=createdAt&sortOrder=desc
```

## Upload de Fichiers

L'upload de fichiers supporte :
- **Types** : JPEG, PNG, PDF, DOC, DOCX
- **Taille max** : 10MB par fichier
- **Organisation** : Fichiers organisés par type dans des sous-dossiers

## Validation

Tous les endpoints sont validés avec Zod. Les erreurs de validation retournent un format standardisé :

```json
{
  "data": null,
  "error": "Données de validation invalides",
  "details": [
    {
      "field": "email",
      "message": "Email invalide"
    }
  ]
}
```

## Audit

Toutes les opérations CRUD sont automatiquement auditées avec :
- Action effectuée
- Utilisateur responsable
- Anciennes et nouvelles valeurs
- Horodatage

## Gestion des Erreurs

L'API retourne des réponses standardisées :

```json
{
  "data": {...},        // Données en cas de succès
  "error": null         // Null en cas de succès
}
```

En cas d'erreur :

```json
{
  "data": null,
  "error": "Message d'erreur"
}
```

## Scripts Disponibles

- `npm run dev` - Démarrage en mode développement
- `npm run build` - Construction pour la production
- `npm start` - Démarrage en mode production
- `npx prisma studio` - Interface graphique pour la base de données
- `npx prisma migrate dev` - Appliquer les migrations
