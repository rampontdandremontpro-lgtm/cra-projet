# Backend - CRA Project

## Présentation

Le backend est développé avec NestJS.

Il expose une API REST permettant la gestion complète des utilisateurs, clients, CRA, jours fériés et statistiques.

## Technologies utilisées

* Node.js
* NestJS
* TypeORM
* JWT
* bcrypt
* MySQL

## Installation

Installation des dépendances :

```bash
npm install
```

Lancement du serveur :

```bash
npm run start:dev
```

## Variables d'environnement

Créer un fichier `.env` :

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=root
DB_DATABASE=cra_project

JWT_SECRET=secret_key
```

## Modules

### Auth

Gestion de l'authentification et des tokens JWT.

### Users

Gestion des utilisateurs.

### Clients

Gestion des entreprises clientes.

### CRA

Gestion des comptes-rendus d'activité.

### Holidays

Gestion des jours fériés.

### Stats

Calcul des statistiques administratives.

### PDF

Génération des documents PDF.

## Architecture

```text
src/
├── auth/
├── users/
├── clients/
├── cra/
├── holidays/
├── stats/
└── pdf/
```

## Base de données

Principales tables :

* users
* clients
* cra
* cra_days
* holidays

## API REST

Exemples de routes :

```http
POST /auth/login
GET /cra
POST /cra
POST /cra/:id/submit
POST /cra/:id/validate-client
POST /cra/:id/refuse-client
POST /cra/:id/validate-admin
POST /cra/:id/refuse-admin
GET /stats
GET /holidays
```

## Objectif

Centraliser et sécuriser la gestion des CRA tout en garantissant la traçabilité du processus de validation.
