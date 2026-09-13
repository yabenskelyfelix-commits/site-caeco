const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data', 'offers.json');

function ensureDbFile() {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ offers: [], nextId: 1 }, null, 2));
    }
}

function readDb() {
    ensureDbFile();
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function writeDb(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function getAllOffers() {
    return readDb().offers;
}

function createOffer({ titre, description, dateExpiration }) {
    const db = readDb();
    const offre = {
        id: db.nextId,
        titre,
        description,
        dateExpiration: dateExpiration || null,
        datePublication: new Date().toISOString().slice(0, 10)
    };
    db.offers.push(offre);
    db.nextId += 1;
    writeDb(db);
    return offre;
}

function deleteOffer(id) {
    const db = readDb();
    const tailleAvant = db.offers.length;
    db.offers = db.offers.filter(o => o.id !== id);
    writeDb(db);
    return db.offers.length < tailleAvant;
}

module.exports = { getAllOffers, createOffer, deleteOffer };
