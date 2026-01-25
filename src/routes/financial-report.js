const express = require('express');
const router = express.Router();

const fs = require('fs');
const path = require('path');

router.get('/', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const positionDate = req.query.positionDate || today;

    const MASTER_DATA_PATH = path.join(__dirname, '../data/bank_master.json');
    const BALANCES_DATA_PATH = path.join(__dirname, '../data/bank_balances_daily.json');

    const BANK_ORDER = [
        "SBI – PLATINUM",
        "IOB – 5555",
        "I.B",
        "IOB – 42300",
        "IOB – 142300"
    ];

    let bankData = [];
    let totalBankBalance = 0;

    try {
        const banksMaster = JSON.parse(fs.readFileSync(MASTER_DATA_PATH, 'utf8'));
        const dailyBalances = JSON.parse(fs.readFileSync(BALANCES_DATA_PATH, 'utf8'));
        const availableDates = Object.keys(dailyBalances).sort();

        bankData = BANK_ORDER.map(name => {
            const master = banksMaster.find(b => b.bankName === name);
            let balance = 0;
            if (master) {
                const effectiveDate = availableDates.slice().reverse().find(d => d <= positionDate && dailyBalances[d][master.id] !== undefined);
                if (effectiveDate) balance = dailyBalances[effectiveDate][master.id];
            }
            totalBankBalance += balance;
            return { name, balance };
        });
    } catch (err) {
        console.error('Financial Report Bank Error:', err);
    }

    res.render('financial-report', { 
        today, 
        positionDate, 
        bankData, 
        totalBankBalance 
    });
});

module.exports = router;
