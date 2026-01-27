const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { toDDMMYYYY } = require('../utils/dateUtils');

const PLANNING_DATA_PATH = path.join(__dirname, '../data/payment_planning.json');
const MASTER_DATA_PATH = path.join(__dirname, '../data/bank_master.json');

const getPlanning = () => {
    if (!fs.existsSync(PLANNING_DATA_PATH)) return {};
    try { return JSON.parse(fs.readFileSync(PLANNING_DATA_PATH, 'utf8') || '{}'); }
    catch (e) { return {}; }
};

const savePlanning = (data) => {
    fs.writeFileSync(PLANNING_DATA_PATH, JSON.stringify(data, null, 2));
};

router.get('/', (req, res) => {
    const planning = getPlanning();
    const banks = JSON.parse(fs.readFileSync(MASTER_DATA_PATH, 'utf8') || '[]');
    const rawToday = new Date().toISOString().split('T')[0];
    const today = toDDMMYYYY(rawToday);
    const positionDate = req.query.positionDate ? toDDMMYYYY(req.query.positionDate) : today;
    const bankId = req.query.bankId || (banks.length > 0 ? banks[0].id : null);
    
    // Calculate Available Fund (Net Collection ONLY)
    const COLLECTIONS_DATA_PATH = path.join(__dirname, '../data/daily_collections.json');
    let netCollection = 0;

    try {
        if (fs.existsSync(COLLECTIONS_DATA_PATH)) {
            const collections = JSON.parse(fs.readFileSync(COLLECTIONS_DATA_PATH, 'utf8'));
            if (collections[positionDate]) {
                netCollection = collections[positionDate].netCollection || 0;
            }
        }
    } catch (err) {
        console.error('Error calculating funds:', err);
    }

    const availableFund = netCollection;
    const allEntries = planning[positionDate] || [];
    // Filter entries by bankId
    const entries = allEntries.filter(e => e.bankId === bankId);
    
    res.render('payment-planning', { entries, positionDate, bankId, banks, availableFund });
});

router.post('/save', (req, res) => {
    let { positionDate, bankId, payments } = req.body;
    positionDate = toDDMMYYYY(positionDate);
    const planning = getPlanning();
    
    if (!planning[positionDate]) planning[positionDate] = [];
    
    // Remove existing entries for this bank and date to overwrite
    planning[positionDate] = planning[positionDate].filter(e => e.bankId !== bankId);
    
    // Add new entries with bankId
    const validPayments = payments.filter(p => parseFloat(p.amount) > 0).map(p => ({
        category: p.category,
        subCategory: p.subCategory,
        amount: parseFloat(p.amount),
        bankId,
        updatedAt: new Date().toISOString()
    }));
    
    planning[positionDate].push(...validPayments);
    
    savePlanning(planning);
    res.json({ success: true });
});

module.exports = router;
