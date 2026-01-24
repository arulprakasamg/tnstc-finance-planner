const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

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
    const today = new Date().toISOString().split('T')[0];
    const positionDate = req.query.positionDate || today;
    
    // Calculate Available Fund
    const BALANCES_DATA_PATH = path.join(__dirname, '../data/bank_balances_daily.json');
    const COLLECTIONS_DATA_PATH = path.join(__dirname, '../data/daily_collections.json');
    
    let totalBankBalance = 0;
    let netCollection = 0;

    try {
        if (fs.existsSync(BALANCES_DATA_PATH)) {
            const dailyBalances = JSON.parse(fs.readFileSync(BALANCES_DATA_PATH, 'utf8'));
            const availableDates = Object.keys(dailyBalances).sort();
            
            banks.forEach(bank => {
                // Rolling logic: find latest balance on or before positionDate
                const effectiveDate = availableDates.slice().reverse().find(d => d <= positionDate && dailyBalances[d][bank.id] !== undefined);
                if (effectiveDate) {
                    totalBankBalance += dailyBalances[effectiveDate][bank.id] || 0;
                }
            });
        }
        
        if (fs.existsSync(COLLECTIONS_DATA_PATH)) {
            const collections = JSON.parse(fs.readFileSync(COLLECTIONS_DATA_PATH, 'utf8'));
            if (collections[positionDate]) {
                netCollection = collections[positionDate].netCollection || 0;
            }
        }
    } catch (err) {
        console.error('Error calculating funds:', err);
    }

    const availableFund = totalBankBalance + netCollection;
    const entries = planning[positionDate] || [];
    res.render('payment-planning', { entries, positionDate, banks, availableFund });
});

router.post('/save', (req, res) => {
    const { positionDate, bankId, payments } = req.body;
    const planning = getPlanning();
    
    // payments is expected to be an array of { category, subCategory, amount }
    const validPayments = payments.filter(p => parseFloat(p.amount) > 0).map(p => ({
        ...p,
        bankId,
        amount: parseFloat(p.amount),
        updatedAt: new Date().toISOString()
    }));

    planning[positionDate] = validPayments;
    savePlanning(planning);
    res.json({ success: true });
});

module.exports = router;
