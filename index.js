const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const userStore = require('./lib/userStore');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'caeco-dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 24h
    }
}));

function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login.html?error=auth');
    }
    next();
}

// Page protégée : doit être déclarée AVANT express.static pour intercepter la requête.
app.get('/dashboard.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.post('/register', (req, res) => {
    const { prenom, nom, email, telephone, password, password_confirm } = req.body;

    if (!prenom || !nom || !email || !password || !password_confirm) {
        return res.redirect('/register.html?error=missing');
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

app.post('/login', (req, res) => {
    const { email, password } = req.body;
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

app.use(express.static(__dirname));

app.listen(PORT, () => {
    console.log(`CAECO server running on http://localhost:${PORT}`);
});

module.exports = app;
