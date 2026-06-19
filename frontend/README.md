# Frontend - CRA Project

## Présentation

Le frontend est développé avec React et Vite.

Il permet aux différents acteurs de l'application (Collaborateur, Client, RH et Administrateur) d'interagir avec le système de gestion des CRA.

## Technologies utilisées

* React
* Vite
* JavaScript ES6+
* JSX
* Axios
* React Router
* CSS

## Lancement du projet

Installation des dépendances :

```bash
npm install
```

Lancement du serveur de développement :

```bash
npm run dev
```

## Structure du projet

```text
src/
├── pages/
├── components/
├── services/
├── context/
└── styles/
```

## Pages principales

* LoginPage
* DashboardPage
* CraListPage
* CraCreatePage
* CraFormPage
* CraDetailPage
* ClientCraValidationPage
* AdminCraValidationPage
* RhDashboardPage
* AdminUsersPage
* AdminClientsPage
* AdminHolidaysPage
* AdminStatsPage

## Communication API

Les appels vers le backend sont centralisés dans le dossier :

```text
src/services/
```

et utilisent Axios.

## Objectif

Fournir une interface moderne, intuitive et responsive permettant de gérer l'ensemble du cycle de vie d'un CRA.
