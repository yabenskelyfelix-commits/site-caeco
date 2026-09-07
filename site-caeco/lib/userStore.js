const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data', 'users.json');

function ensureDbFile() {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], nextId: 1 }, null, 2));
    }
}

function readDb() {
    ensureDbFile();
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function writeDb(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function findByEmail(email) {
    const db = readDb();
    return db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

function findById(id) {
    const db = readDb();
    return db.users.find(u => u.id === id);
}

function createUser({ prenom, nom, email, telephone, passwordHash }) {
    const db = readDb();
    const user = {
        id: db.nextId,
        prenom,
        nom,
        email,
        telephone: telephone || '',
        passwordHash
    };
    db.users.push(user);
    db.nextId += 1;
    writeDb(db);
    return user;
}

module.exports = { findByEmail, findById, createUser };
