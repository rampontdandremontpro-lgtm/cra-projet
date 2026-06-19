# CRA Project

## Présentation

CRA Project est une application web permettant de dématérialiser la gestion des Comptes-Rendus d’Activité (CRA).

L'application permet aux collaborateurs de déclarer leurs activités, congés et absences, puis de soumettre leurs CRA à un client pour validation.

Une fois validé par le client, le CRA est transmis à un administrateur pour une validation finale.

## Fonctionnalités principales

* Authentification des utilisateurs
* Gestion des collaborateurs
* Gestion des clients
* Création et modification des CRA
* Gestion des congés et absences
* Gestion des jours fériés
* Validation client
* Validation administrateur
* Génération PDF des CRA
* Tableau de bord RH
* Tableau de bord Administrateur

## Technologies

### Frontend

* React
* Vite
* JavaScript ES6+
* JSX
* Axios
* React Router
* CSS

### Backend

* Node.js
* NestJS
* TypeORM
* JWT
* bcrypt

### Base de données

* MySQL

## Architecture

```text
Frontend React
        ↓
      Axios
        ↓
 API NestJS
        ↓
     MySQL
```

## Installation

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run start:dev
```

## Auteur

Projet réalisé dans le cadre d'un stage de développement web.
