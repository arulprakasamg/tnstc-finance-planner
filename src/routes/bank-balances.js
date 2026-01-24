const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

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

// List all bank masters
router.get('/', (req, res) => {
    const banks = getMasterData();
    res.render('bank-balances', { banks });
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
