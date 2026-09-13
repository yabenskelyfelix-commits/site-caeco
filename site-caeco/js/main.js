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
        auth: 'Veuillez vous connecter pour accéder à cette page.',
        rate_limited: 'Trop de tentatives. Veuillez réessayer dans quelques minutes.'
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
        invalid_email: 'Veuillez saisir une adresse email valide.',
        weak: 'Le mot de passe doit contenir au moins 8 caractères.',
        mismatch: 'Les mots de passe ne correspondent pas.',
        exists: 'Un compte existe déjà avec cet email.',
        rate_limited: 'Trop de tentatives. Veuillez réessayer dans quelques minutes.'
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

/* --- dashboard.html : chargement des informations utilisateur ---
   baseChargee : promesse de chargerBase(), pour attendre que le header
   (et donc .login-btn) soit bien dans le DOM avant de le modifier. */
function initialiserDashboard(baseChargee) {
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

            const avatar = document.getElementById('user-avatar');
            if (avatar) {
                avatar.textContent = `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase();
            }

            // L'utilisateur est authentifié ici : le bouton d'en-tête devient la déconnexion
            Promise.resolve(baseChargee).then(() => {
                const boutonCompte = document.querySelector('.login-btn');
                if (boutonCompte) {
                    boutonCompte.textContent = 'Déconnexion';
                    boutonCompte.href = '/logout';
                }
            });
        })
        .catch(() => {
            window.location.href = 'login.html?error=auth';
        });
}

/* --- dashboard.html : liste des offres CAECO (visible par tous),
   avec formulaire de publication pour l'équipe CAECO uniquement --- */
function initialiserOffres() {
    const liste = document.getElementById('offers-list');
    if (!liste) return;

    const formulaire = document.getElementById('offer-form');
    const zoneErreurForm = document.getElementById('offer-form-error');

    function echapperHtml(texte) {
        const div = document.createElement('div');
        div.textContent = texte;
        return div.innerHTML;
    }

    function formaterDate(dateStr) {
        const [annee, mois, jour] = dateStr.split('-');
        return `${jour}/${mois}/${annee}`;
    }

    function supprimerOffre(id, carte) {
        fetch(`/api/offers/${id}`, { method: 'DELETE' })
            .then(res => {
                if (res.ok) carte.remove();
            });
    }

    function creerCarteOffre(offre, admin) {
        const carte = document.createElement('article');
        carte.className = 'offer-card' + (offre.expiree ? ' offer-card-expired' : '');

        const expiration = offre.dateExpiration
            ? `Expire le ${formaterDate(offre.dateExpiration)}`
            : "Sans date d'expiration";

        carte.innerHTML = `
            <div class="offer-card-header">
                <h3>${echapperHtml(offre.titre)}</h3>
                <span class="status-badge ${offre.expiree ? 'status-expired' : 'status-active'}">
                    ${offre.expiree ? 'Expirée' : 'Active'}
                </span>
            </div>
            <p>${echapperHtml(offre.description)}</p>
            <p class="offer-meta">Publiée le ${formaterDate(offre.datePublication)} · ${expiration}</p>
        `;

        if (admin) {
            const boutonSupprimer = document.createElement('button');
            boutonSupprimer.type = 'button';
            boutonSupprimer.className = 'offer-delete';
            boutonSupprimer.textContent = 'Supprimer';
            boutonSupprimer.addEventListener('click', () => supprimerOffre(offre.id, carte));
            carte.appendChild(boutonSupprimer);
        }

        return carte;
    }

    function chargerOffres() {
        fetch('/api/offers')
            .then(res => res.json())
            .then(({ offres, estAdmin }) => {
                if (estAdmin && formulaire) {
                    formulaire.hidden = false;
                }
                liste.innerHTML = '';
                if (offres.length === 0) {
                    liste.innerHTML = '<div class="empty-state"><p class="empty-state-icon" aria-hidden="true">📢</p><p>Aucune offre publiée pour l\'instant.</p></div>';
                    return;
                }
                offres.forEach(offre => liste.appendChild(creerCarteOffre(offre, estAdmin)));
            })
            .catch(() => {
                liste.innerHTML = '<p class="form-note">Impossible de charger les offres pour le moment.</p>';
            });
    }

    if (formulaire) {
        formulaire.addEventListener('submit', e => {
            e.preventDefault();
            zoneErreurForm.style.display = 'none';

            fetch('/api/offers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    titre: document.getElementById('offer-titre').value.trim(),
                    description: document.getElementById('offer-description').value.trim(),
                    dateExpiration: document.getElementById('offer-expiration').value || null
                })
            })
                .then(res => {
                    if (!res.ok) throw new Error('erreur');
                    return res.json();
                })
                .then(() => {
                    formulaire.reset();
                    chargerOffres();
                })
                .catch(() => {
                    zoneErreurForm.textContent = "Impossible de publier l'offre. Vérifiez les champs.";
                    zoneErreurForm.style.display = 'block';
                });
        });
    }

    chargerOffres();
}

/* ------------------------------------------------------------
   DÉMARRAGE
   ------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
    const baseChargee = chargerBase();
    initialiserLogin();
    initialiserRegister();
    initialiserDashboard(baseChargee);
    initialiserOffres();
});
