const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const COLLECTIONS_DATA_PATH = path.join(__dirname, '../data/daily_collections.json');

// Helper to read collections data
const getCollections = () => {
    if (!fs.existsSync(COLLECTIONS_DATA_PATH)) return {};
    try {
        const data = fs.readFileSync(COLLECTIONS_DATA_PATH, 'utf8');
        return JSON.parse(data || '{}');
    } catch (e) {
        return {};
    }
};

// Helper to save collections data
const saveCollections = (data) => {
    fs.writeFileSync(COLLECTIONS_DATA_PATH, JSON.stringify(data, null, 2));
};

// Helper to get today's date string
const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
};

// Helper to get yesterday's date string
const getYesterdayDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
};

// Render Daily Collections Page
router.get('/', (req, res) => {
    const collections = getCollections();
    const today = getTodayDate();
    const yesterday = getYesterdayDate();
    
    // Default search/entry date to today
    const positionDate = req.query.positionDate || today;
    const entry = collections[positionDate] || {
        fromDate: yesterday,
        toDate: yesterday,
        grossCollection: 0,
        batta: 0,
        posCharges: 0,
        netCollection: 0
    };

    res.render('daily-collections', { entry, positionDate });
});

// Save/Update Collection Entry
router.post('/save', (req, res) => {
    const { positionDate, fromDate, toDate, grossCollection, batta, posCharges, netCollection } = req.body;
    const collections = getCollections();

    collections[positionDate] = {
        fromDate,
        toDate,
        grossCollection: parseFloat(grossCollection) || 0,
        batta: parseFloat(batta) || 0,
        posCharges: parseFloat(posCharges) || 0,
        netCollection: parseFloat(netCollection) || 0,
        updatedAt: new Date().toISOString()
    };

    saveCollections(collections);
    res.json({ success: true, message: 'Collection entry saved successfully' });
});

module.exports = router;
