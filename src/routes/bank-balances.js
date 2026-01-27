const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { toDDMMYYYY, ddmmyyyyToYmd } = require('../utils/dateUtils');

const MASTER_DATA_PATH = path.join(__dirname, '../data/bank_master.json');

// Helper to read master data
const getMasterData = () => {
    if (!fs.existsSync(MASTER_DATA_PATH)) return [];
    return JSON.parse(fs.readFileSync(MASTER_DATA_PATH, 'utf8'));
};

// Helper to save master data
const saveMasterData = (data) => {
    fs.writeFileSync(MASTER_DATA_PATH, JSON.stringify(data, null, 2));
};

const BALANCES_DATA_PATH = path.join(__dirname, '../data/bank_balances_daily.json');

// Helper to read daily balances
const getDailyBalances = () => {
    if (!fs.existsSync(BALANCES_DATA_PATH)) return {};
    return JSON.parse(fs.readFileSync(BALANCES_DATA_PATH, 'utf8'));
};

// Helper to save daily balances
const saveDailyBalances = (data) => {
    fs.writeFileSync(BALANCES_DATA_PATH, JSON.stringify(data, null, 2));
};

// List all bank masters and balances with rolling logic
router.get('/', (req, res) => {
    const banks = getMasterData();
    const dailyBalances = getDailyBalances();
    const rawPositionDate = req.query.positionDate || new Date().toISOString().split('T')[0];
    const positionDate = toDDMMYYYY(rawPositionDate);
    
    // Sort dates to find the most recent previous balance
    // For dd/mm/yyyy keys, we need to convert to yyyy-mm-dd for proper sorting
    const sortedDates = Object.keys(dailyBalances).sort((a, b) => {
        return ddmmyyyyToYmd(b).localeCompare(ddmmyyyyToYmd(a));
    });

    // Enrich banks with balance for the selected date or carry forward
    const enrichedBanks = banks.map(bank => {
        let balance = 0;
        let isCarriedForward = false;
        let lastUpdated = null;

        if (dailyBalances[positionDate] && dailyBalances[positionDate][bank.id] !== undefined) {
            balance = dailyBalances[positionDate][bank.id];
            isCarriedForward = false;
            lastUpdated = positionDate;
        } else {
            // Find most recent previous balance
            const previousDate = sortedDates.find(d => ddmmyyyyToYmd(d) < ddmmyyyyToYmd(positionDate) && dailyBalances[d][bank.id] !== undefined);
            if (previousDate) {
                balance = dailyBalances[previousDate][bank.id];
                isCarriedForward = true;
                lastUpdated = previousDate;
            }
        }

        return {
            ...bank,
            balance,
            isCarriedForward,
            lastUpdated
        };
    });

    res.render('bank-balances', { banks: enrichedBanks, positionDate });
});

// Save single bank balance
router.post('/save-balance', (req, res) => {
    console.log('POST /save-balance body:', req.body);
    const body = req.body || {};
    let { bankId, balance, positionDate } = body;
    
    if (!bankId || !positionDate) {
        console.error('Missing required fields for save-balance');
        return res.status(400).send('Bank ID and Position Date are required');
    }

    positionDate = toDDMMYYYY(positionDate);
    const dailyBalances = getDailyBalances();

    if (!dailyBalances[positionDate]) {
        dailyBalances[positionDate] = {};
    }

    dailyBalances[positionDate][bankId] = parseFloat(balance) || 0;
    saveDailyBalances(dailyBalances);
    
    const redirectUrl = `/bank-balances?positionDate=${ddmmyyyyToYmd(positionDate)}`;
    // For AJAX/JSON requests, send a 200 OK or a JSON response
    if (req.xhr || req.headers.accept.indexOf('json') > -1 || req.headers['content-type'] === 'application/json') {
        return res.json({ success: true, redirect: redirectUrl });
    }
    res.redirect(redirectUrl);
});

// Save all bank balances
router.post('/save-all-balances', (req, res) => {
    console.log('POST /save-all-balances body:', req.body);
    const body = req.body || {};
    let { balances = {}, positionDate } = body;

    if (!positionDate) {
        console.error('Missing positionDate for save-all-balances');
        return res.status(400).send('Position Date is required');
    }

    positionDate = toDDMMYYYY(positionDate);
    const dailyBalances = getDailyBalances();

    if (!dailyBalances[positionDate]) {
        dailyBalances[positionDate] = {};
    }

    Object.keys(balances).forEach(bankId => {
        dailyBalances[positionDate][bankId] = parseFloat(balances[bankId]) || 0;
    });

    saveDailyBalances(dailyBalances);

    const redirectUrl = `/bank-balances?positionDate=${ddmmyyyyToYmd(positionDate)}`;
    // For AJAX/JSON requests
    if (req.xhr || req.headers.accept.indexOf('json') > -1 || req.headers['content-type'] === 'application/json') {
        return res.json({ success: true, redirect: redirectUrl });
    }
    res.redirect(redirectUrl);
});

// Create new bank master
router.post('/add', (req, res) => {
    const { accountName, accountNumber, bankName, accountType } = req.body;
    const banks = getMasterData();

    // Unique Account Number validation
    if (banks.some(b => b.accountNumber === accountNumber)) {
        return res.status(400).send('Account Number must be unique');
    }

    const newBank = {
        id: Date.now().toString(),
        accountName,
        accountNumber,
        bankName,
        accountType
    };

    banks.push(newBank);
    saveMasterData(banks);
    res.redirect('/bank-balances');
});

// Update bank master
router.post('/edit/:id', (req, res) => {
    const { id } = req.params;
    const { accountName, accountNumber, bankName, accountType } = req.body;
    let banks = getMasterData();

    const index = banks.findIndex(b => b.id === id);
    if (index !== -1) {
        // Unique Account Number check (excluding current record)
        if (banks.some(b => b.accountNumber === accountNumber && b.id !== id)) {
            return res.status(400).send('Account Number must be unique');
        }

        banks[index] = { ...banks[index], accountName, accountNumber, bankName, accountType };
        saveMasterData(banks);
    }
    res.redirect('/bank-balances');
});

module.exports = router;
