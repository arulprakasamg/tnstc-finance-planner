const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const { normalizeToDDMMYYYY } = require('../utils/dateUtils');

const COLLECTIONS_DATA_PATH = path.join(__dirname, '../data/daily_collections.json');

// Helper to read collections data
const getCollections = () => {
    if (!fs.existsSync(COLLECTIONS_DATA_PATH)) return {};
    try {
        const data = fs.readFileSync(COLLECTIONS_DATA_PATH, 'utf8');
        return JSON.parse(data || '{}');
    } catch {
        return {};
    }
};

// Helper to save collections data
const saveCollections = (data) => {
    fs.writeFileSync(COLLECTIONS_DATA_PATH, JSON.stringify(data, null, 2));
};

// Helper to get today's date (dd/mm/yyyy)
const getTodayDate = () => {
    return new Date().toLocaleDateString('en-GB');
};

// Helper to get yesterday's date (dd/mm/yyyy)
const getYesterdayDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('en-GB');
};

// Render Daily Collections Page
router.get('/', (req, res) => {
    const collections = getCollections();

    const today = getTodayDate();
    const yesterday = getYesterdayDate();

    const positionDate = normalizeToDDMMYYYY(req.query.positionDate) || today;

    const entry = collections[positionDate] || {
        fromDate: yesterday,
        toDate: yesterday,
        grossCollection: 0,
        batta: 0,
        posCharges: 0,
        netCollection: 0
    };

    res.render('daily-collections', {
        entry,
        positionDate
    });
});

// Save/Update Collection Entry
router.post('/save', (req, res) => {
    const collections = getCollections();

    const positionDate = normalizeToDDMMYYYY(req.body.positionDate);
    const fromDate = normalizeToDDMMYYYY(req.body.fromDate);
    const toDate = normalizeToDDMMYYYY(req.body.toDate);

    if (!positionDate) {
        return res.status(400).json({ success: false, message: 'Invalid position date' });
    }

    collections[positionDate] = {
        fromDate,
        toDate,
        grossCollection: parseFloat(req.body.grossCollection) || 0,
        batta: parseFloat(req.body.batta) || 0,
        posCharges: parseFloat(req.body.posCharges) || 0,
        netCollection: parseFloat(req.body.netCollection) || 0,
        updatedAt: new Date().toLocaleString('en-GB')
    };

    saveCollections(collections);
    res.json({ success: true, message: 'Collection entry saved successfully' });
});

module.exports = router;