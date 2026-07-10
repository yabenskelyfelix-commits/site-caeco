/* ============================================================
   MAIN.JS — SCRIPT UNIQUE DU SITE CAECO
   ============================================================
   1. Charge le header et le footer depuis base.html
   2. Active le menu hamburger (mobile)
   3. Marque automatiquement la page active dans la navigation
   4. Gère les scripts spécifiques : login, register, dashboard

   ➜ Tout le JavaScript du site vit ici : une seule page à
     modifier pour changer un comportement partout.
   ============================================================ */

/* ------------------------------------------------------------
   1. INJECTION DU HEADER ET DU FOOTER (depuis base.html)
   ------------------------------------------------------------ */
async function chargerBase() {
    try {
        const reponse = await fetch('base.html');
        if (!reponse.ok) throw new Error('base.html introuvable');

        const html = await reponse.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const header = doc.querySelector('header');
        const footer = doc.querySelector('footer');

        if (header) document.body.insertAdjacentElement('afterbegin', header);
        if (footer) document.body.insertAdjacentElement('beforeend', footer);

        initialiserMenu();
        marquerPageActive();
    } catch (erreur) {
        console.error('Impossible de charger le header/footer :', erreur);
        // Filet de sécurité : un lien de retour minimal si base.html ne charge pas
        document.body.insertAdjacentHTML(
            'afterbegin',
            '<p style="padding:15px;text-align:center;"><a href="index.html">← Accueil CAECO</a></p>'
        );
    }
}

/* ------------------------------------------------------------
   2. MENU HAMBURGER (mobile)
   ------------------------------------------------------------ */
function initialiserMenu() {
    const toggle = document.querySelector('.menu-toggle');
    const header = document.querySelector('header');
    if (!toggle || !header) return;

    toggle.addEventListener('click', () => {
        const ouvert = header.classList.toggle('menu-open');
        toggle.setAttribute('aria-expanded', ouvert);
        toggle.setAttribute('aria-label', ouvert ? 'Fermer le menu' : 'Ouvrir le menu');
    });

    // Ferme le menu quand on choisit une page
    document.querySelectorAll('#menu-principal a').forEach(lien => {
        lien.addEventListener('click', () => header.classList.remove('menu-open'));
    });

    // La touche Échap ferme le menu et rend le focus au bouton
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && header.classList.contains('menu-open')) {
            header.classList.remove('menu-open');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.focus();
        }
    });
}

/* ------------------------------------------------------------
   3. PAGE ACTIVE DANS LA NAVIGATION (aria-current)
   ------------------------------------------------------------ */
function marquerPageActive() {
    // Nom du fichier courant ("" ou "index.html" pour l'accueil)
    let pageCourante = window.location.pathname.split('/').pop();
    if (pageCourante === '') pageCourante = 'index.html';

    document.querySelectorAll('#menu-principal a, footer nav a').forEach(lien => {
        const cible = lien.getAttribute('href').split('#')[0];
        if (cible === pageCourante) {
            lien.setAttribute('aria-current', 'page');
        }
    });
}

/* ------------------------------------------------------------
   4. SCRIPTS SPÉCIFIQUES AUX PAGES
   (chaque bloc ne s'exécute que si ses éléments existent)
   ------------------------------------------------------------ */

/* --- login.html : affichage des messages d'erreur --- */
function initialiserLogin() {
    const zoneErreur = document.getElementById('login-error');
    if (!zoneErreur) return;

    const params = new URLSearchParams(window.location.search);
    const erreur = params.get('error');
    const messages = {
        invalid: 'Email ou mot de passe incorrect.',
        auth: 'Veuillez vous connecter pour accéder à cette page.'
    };
    if (erreur && messages[erreur]) {
        zoneErreur.textContent = messages[erreur];
        zoneErreur.style.display = 'block';
    }
}

/* --- register.html : messages d'erreur + vérification des mots de passe --- */
function initialiserRegister() {
    const zoneErreur = document.getElementById('register-error');
    if (!zoneErreur) return;

    const params = new URLSearchParams(window.location.search);
    const erreur = params.get('error');
    const messages = {
        missing: 'Veuillez remplir tous les champs obligatoires.',
        weak: 'Le mot de passe doit contenir au moins 8 caractères.',
        mismatch: 'Les mots de passe ne correspondent pas.',
        exists: 'Un compte existe déjà avec cet email.'
    };
    if (erreur && messages[erreur]) {
        zoneErreur.textContent = messages[erreur];
        zoneErreur.style.display = 'block';
    }

    // Vérification immédiate côté client : les deux mots de passe concordent
    const mdp = document.getElementById('register-password');
    const confirmation = document.getElementById('register-password-confirm');
    if (mdp && confirmation) {
        confirmation.addEventListener('input', () => {
            confirmation.setCustomValidity(
                confirmation.value === mdp.value ? '' : 'Les mots de passe ne correspondent pas.'
            );
        });
    }
}

/* --- dashboard.html : chargement des informations utilisateur --- */
function initialiserDashboard() {
    const zonePrenom = document.getElementById('user-prenom');
    if (!zonePrenom) return;

    fetch('/api/me')
        .then(res => {
            if (!res.ok) throw new Error('not_authenticated');
            return res.json();
        })
        .then(user => {
            zonePrenom.textContent = user.prenom;
            document.getElementById('user-nom-complet').textContent = `${user.prenom} ${user.nom}`;
            document.getElementById('user-email').textContent = user.email;
            document.getElementById('user-telephone').textContent = user.telephone || 'Non renseigné';
        })
        .catch(() => {
            window.location.href = 'login.html?error=auth';
        });
}

/* ------------------------------------------------------------
   DÉMARRAGE
   ------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
    chargerBase();
    initialiserLogin();
    initialiserRegister();
    initialiserDashboard();
});
