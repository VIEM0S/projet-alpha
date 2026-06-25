# Projet Alpha — Gestion Quincaillerie

Application web interne de gestion de quincaillerie.
Stack : React + TypeScript (frontend) · Node.js + Express (backend) · PostgreSQL (base de données)

---

## Prérequis

- Node.js >= 18
- PostgreSQL >= 14
- npm >= 9

---

## Installation

### 1. Base de données

```bash
# Créer la base de données
psql -U postgres -c "CREATE DATABASE projet_alpha_quincaillerie;"

# Appliquer le schéma
psql -U postgres -d projet_alpha_quincaillerie -f backend/src/config/schema.sql
```

### 2. Backend

```bash
cd backend

# Copier et configurer les variables d'environnement
cp .env.example .env
# Éditez .env avec vos valeurs (DB_PASSWORD, JWT_SECRET, etc.)

# Installer les dépendances
npm install

# Créer le compte responsable initial
npm run db:seed

# Démarrer en développement
npm run dev
```

Le backend démarre sur : http://localhost:5000

### 3. Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Démarrer en développement
npm run dev
```

Le frontend démarre sur : http://localhost:5173

---

## Connexion initiale

| Champ        | Valeur      |
|--------------|-------------|
| Login        | admin       |
| Mot de passe | Admin@2024  |

> ⚠️ Changez ce mot de passe immédiatement après la première connexion.

---

## Structure du projet

```
projet-alpha/
├── backend/
│   └── src/
│       ├── config/          # DB, schéma SQL, seed
│       ├── controllers/     # Logique métier par domaine
│       ├── middleware/      # Auth JWT, audit, erreurs
│       ├── routes/          # Routes API REST
│       └── server.js        # Point d'entrée
│
└── frontend/
    └── src/
        ├── components/      # Layout, composants partagés
        ├── contexts/        # AuthContext
        ├── pages/           # Pages par domaine
        ├── services/        # Appels API
        ├── types/           # Types TypeScript
        └── utils/           # Formatage, utilitaires
```

---

## API REST — Endpoints principaux

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | /api/auth/login | Connexion |
| GET | /api/articles | Lister les articles |
| POST | /api/articles | Créer un article |
| POST | /api/stocks/entree | Entrée de stock |
| POST | /api/stocks/ajustement | Ajustement manuel |
| GET | /api/clients | Lister les clients |
| POST | /api/ventes | Créer une vente |
| POST | /api/ventes/:id/annuler | Annuler une vente |
| POST | /api/devis | Créer un devis |
| POST | /api/devis/:id/convertir | Convertir en vente |
| POST | /api/credits/:id/versement | Enregistrer un versement |
| GET | /api/dashboard | Tableau de bord (responsable) |

---

## Rôles et accès

| Fonctionnalité | Gestionnaire | Responsable |
|----------------|:---:|:---:|
| Ventes, devis, crédits | ✅ | ✅ |
| Gestion des stocks | ✅ | ✅ |
| Voir les articles | ✅ | ✅ |
| Voir le prix d'achat | ❌ | ✅ |
| Tableau de bord & marges | ❌ | ✅ |
| Gérer les utilisateurs | ❌ | ✅ |
| Définir les prix négociés | ❌ | ✅ |

---

## Sécurité

- Authentification JWT (expiration 8h)
- Mots de passe hashés (bcrypt, coût 12)
- SSL/TLS requis en production
- Journal d'audit sur toutes les actions
- Séparation stricte des droits côté serveur

---

## Déploiement production

1. Configurer `NODE_ENV=production` dans `.env`
2. Configurer un reverse proxy (nginx) avec SSL
3. Restreindre l'accès au réseau interne ou VPN
4. Configurer les sauvegardes PostgreSQL automatiques
5. Activer les logs d'audit

---

*Projet Alpha — Module 2 Quincaillerie — Version 1.0 — Usage interne uniquement*
