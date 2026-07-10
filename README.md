# Site CAECO

Site vitrine statique de CAECO (HTML / CSS / JavaScript, sans framework).

## Architecture

- **`base.html`** — source unique du header et du footer. C'est le SEUL
  fichier à modifier pour changer le menu ou le pied de page de tout le site.
- **`js/main.js`** — tout le JavaScript du site : injection du header/footer,
  menu hamburger, marquage de la page active, scripts des pages compte.
- **`style.css`** — feuille de style unique (charte dérivée du logo,
  contrastes validés WCAG AA, commentés dans le fichier).
- **`images/`** — logo, illustration d'accueil (caeco.png), image de partage
  (og-image.png), icônes des services.
- Les autres fichiers `.html` sont les pages du site.

## Important : lancer le site

Le chargement du header/footer utilise `fetch()`, qui ne fonctionne pas en
ouvrant les fichiers directement (adresse `file://`). Utilisez un serveur :

- **En local** : extension "Live Server" de VS Code, ou `python -m http.server`
- **En ligne** : GitHub Pages fonctionne directement.

## À compléter avant mise en ligne

- Les champs marqués `[À COMPLÉTER]` dans les pages.
- Les liens des réseaux sociaux dans `contact.html` (actuellement `#`).
- La carte dans `contact.html` (OpenStreetMap provisoire — remplacer par
  l'intégration Google Maps de l'adresse exacte).
- Les formulaires pointent vers `/submit_form`, `/login`, `/register` :
  il faut soit un backend, soit un service type Formspree / Web3Forms.
- Les pages légales (CGU, confidentialité, cookies) doivent être validées
  par un juriste.
