const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const userStore = require('./lib/userStore');
const offerStore = require('./lib/offerStore');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET && isProduction) {
    throw new Error('SESSION_SECRET environment variable is required in production');
}

app.set('trust proxy', 1);

app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));

app.use(session({
    secret: SESSION_SECRET || 'caeco-dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction,
        maxAge: 1000 * 60 * 60 * 24
    }
}));

function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login.html?error=auth');
    }
    next();
}

// L'équipe CAECO est désignée par une liste d'emails en variable d'environnement,
// faute d'un vrai système de rôles pour l'instant (ADMIN_EMAILS="a@caeco.com,b@caeco.com").
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

function estAdmin(user) {
    return !!user && ADMIN_EMAILS.includes(user.email);
}

function requireAdmin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'not_authenticated' });
    }
    const user = userStore.findById(req.session.userId);
    if (!estAdmin(user)) {
        return res.status(403).json({ error: 'forbidden' });
    }
    next();
}

function offreEstExpiree(dateExpiration) {
    if (!dateExpiration) return false;
    const aujourdHui = new Date().toISOString().slice(0, 10);
    return dateExpiration < aujourdHui;
}

const loginAttempts = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 10;

function rateLimit(req, res, next) {
    const key = req.ip;
    const now = Date.now();
    const entry = loginAttempts.get(key);

    if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
        loginAttempts.set(key, { start: now, count: 1 });
        return next();
    }

    entry.count += 1;
    if (entry.count > RATE_LIMIT_MAX_ATTEMPTS) {
        return res.status(429).redirect('/login.html?error=rate_limited');
    }
    next();
}

app.get('/dashboard.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.post('/register', rateLimit, (req, res) => {
    const { prenom, nom, telephone, password, password_confirm } = req.body;
    const email = (req.body.email || '').trim().toLowerCase();

    if (!prenom || !nom || !email || !password || !password_confirm) {
        return res.redirect('/register.html?error=missing');
    }
    if (!EMAIL_RE.test(email)) {
        return res.redirect('/register.html?error=invalid_email');
    }
    if (password.length < 8) {
        return res.redirect('/register.html?error=weak');
    }
    if (password !== password_confirm) {
        return res.redirect('/register.html?error=mismatch');
    }
    if (userStore.findByEmail(email)) {
        return res.redirect('/register.html?error=exists');
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const user = userStore.createUser({ prenom, nom, email, telephone, passwordHash });

    req.session.userId = user.id;
    res.redirect('/dashboard.html');
});

app.post('/login', rateLimit, (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    const { password } = req.body;
    const user = email && userStore.findByEmail(email);

    if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) {
        return res.redirect('/login.html?error=invalid');
    }

    req.session.userId = user.id;
    res.redirect('/dashboard.html');
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login.html');
    });
});

app.get('/api/me', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'not_authenticated' });
    }
    const user = userStore.findById(req.session.userId);
    if (!user) {
        return res.status(401).json({ error: 'not_authenticated' });
    }
    res.json({
        prenom: user.prenom,
        nom: user.nom,
        email: user.email,
        telephone: user.telephone
    });
});

app.get('/api/offers', requireAuth, (req, res) => {
    const user = userStore.findById(req.session.userId);
    const offres = offerStore.getAllOffers()
        .map(o => ({ ...o, expiree: offreEstExpiree(o.dateExpiration) }))
        .sort((a, b) => b.id - a.id);

    res.json({ offres, estAdmin: estAdmin(user) });
});

app.post('/api/offers', requireAdmin, (req, res) => {
    const { titre, description, dateExpiration } = req.body;

    if (!titre || !titre.trim() || !description || !description.trim()) {
        return res.status(400).json({ error: 'missing_fields' });
    }
    if (dateExpiration && !/^\d{4}-\d{2}-\d{2}$/.test(dateExpiration)) {
        return res.status(400).json({ error: 'invalid_date' });
    }

    const offre = offerStore.createOffer({
        titre: titre.trim(),
        description: description.trim(),
        dateExpiration: dateExpiration || null
    });
    res.status(201).json(offre);
});

app.delete('/api/offers/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    if (!offerStore.deleteOffer(id)) {
        return res.status(404).json({ error: 'not_found' });
    }
    res.status(204).end();
});

const BLOCKED_STATIC_PATHS = [
    '/data', '/lib', '/node_modules', '/.git',
    '/index.js', '/package.json', '/package-lock.json',
    '/readme.md', '/vercel.json'
];

app.use((req, res, next) => {
    const p = req.path.toLowerCase();
    const isBlocked = BLOCKED_STATIC_PATHS.some(prefix => p === prefix || p.startsWith(prefix + '/'));
    if (isBlocked) {
        return res.status(404).sendFile(path.join(__dirname, '404.html'));
    }
    next();
});

app.use(express.static(__dirname));

app.listen(PORT, () => {
    console.log(`CAECO server running on http://localhost:${PORT}`);
});

module.exports = app;
