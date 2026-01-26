const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const { normalizeToDDMMYYYY } = require('../utils/dateUtils');

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

/* ================================
   LIST BANKS + BALANCES
================================ */
router.get('/', (req, res) => {
    const banks = getMasterData();
    const dailyBalances = getDailyBalances();

    const today = normalizeToDDMMYYYY(new Date().toISOString().split('T')[0]);
    const positionDate = normalizeToDDMMYYYY(req.query.positionDate) || today;

    // Sort dates (dd/mm/yyyy) correctly
    const sortedDates = Object.keys(dailyBalances)
        .sort((a, b) => {
            const [da, ma, ya] = a.split('/');
            const [db, mb, yb] = b.split('/');
            return new Date(`${yb}-${mb}-${db}`) - new Date(`${ya}-${ma}-${da}`);
        });

    // Enrich banks with balance for selected date or carry forward
    const enrichedBanks = banks.map(bank => {
        let balance = 0;
        let isCarriedForward = false;
        let lastUpdated = null;

        if (
            dailyBalances[positionDate] &&
            dailyBalances[positionDate][bank.id] !== undefined
        ) {
            balance = dailyBalances[positionDate][bank.id];
            lastUpdated = positionDate;
        } else {
            const previousDate = sortedDates.find(
                d =>
                    d !== positionDate &&
                    dailyBalances[d] &&
                    dailyBalances[d][bank.id] !== undefined
            );
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

    res.render('bank-balances', {
        banks: enrichedBanks,
        positionDate
    });
});

/* ================================
   SAVE SINGLE BANK BALANCE
================================ */
router.post('/save-balance', (req, res) => {
    const body = req.body || {};
    const { bankId, balance } = body;
    const positionDate = normalizeToDDMMYYYY(body.positionDate);

    if (!bankId || !positionDate) {
        return res.status(400).send('Bank ID and Position Date are required');
    }

    const dailyBalances = getDailyBalances();

    if (!dailyBalances[positionDate]) {
        dailyBalances[positionDate] = {};
    }

    dailyBalances[positionDate][bankId] = parseFloat(balance) || 0;
    saveDailyBalances(dailyBalances);

    if (req.xhr || req.headers.accept?.includes('json')) {
        return res.json({
            success: true,
            redirect: `/bank-balances?positionDate=${positionDate}`
        });
    }

    res.redirect(`/bank-balances?positionDate=${positionDate}`);
});

/* ================================
   SAVE ALL BANK BALANCES
================================ */
router.post('/save-all-balances', (req, res) => {
    const body = req.body || {};
    const balances = body.balances || {};
    const positionDate = normalizeToDDMMYYYY(body.positionDate);

    if (!positionDate) {
        return res.status(400).send('Position Date is required');
    }

    const dailyBalances = getDailyBalances();

    if (!dailyBalances[positionDate]) {
        dailyBalances[positionDate] = {};
    }

    Object.keys(balances).forEach(bankId => {
        dailyBalances[positionDate][bankId] = parseFloat(balances[bankId]) || 0;
    });

    saveDailyBalances(dailyBalances);

    if (req.xhr || req.headers.accept?.includes('json')) {
        return res.json({
            success: true,
            redirect: `/bank-balances?positionDate=${positionDate}`
        });
    }

    res.redirect(`/bank-balances?positionDate=${positionDate}`);
});

/* ================================
   CREATE BANK MASTER
================================ */
router.post('/add', (req, res) => {
    const { accountName, accountNumber, bankName, accountType } = req.body;
    const banks = getMasterData();

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

/* ================================
   UPDATE BANK MASTER
================================ */
router.post('/edit/:id', (req, res) => {
    const { id } = req.params;
    const { accountName, accountNumber, bankName, accountType } = req.body;
    let banks = getMasterData();

    const index = banks.findIndex(b => b.id === id);
    if (index !== -1) {
        if (banks.some(b => b.accountNumber === accountNumber && b.id !== id)) {
            return res.status(400).send('Account Number must be unique');
        }

        banks[index] = {
            ...banks[index],
            accountName,
            accountNumber,
            bankName,
            accountType
        };
        saveMasterData(banks);
    }

    res.redirect('/bank-balances');
});

module.exports = router;