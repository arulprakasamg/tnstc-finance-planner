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

    const COLLECTIONS_PATH = path.join(__dirname, '../data/daily_collections.json');
    const PAYMENTS_PATH = path.join(__dirname, '../data/planned_payments.json');

    let bankData = [];
    let totalBankBalance = 0;
    let collectionInfo = null;
    let expenseInfo = {
        oilExp: 0,
        otherExp: 0,
        totalExp: 0,
        balance: 0
    };

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

        // Collection Data
        if (fs.existsSync(COLLECTIONS_PATH)) {
            const collections = JSON.parse(fs.readFileSync(COLLECTIONS_PATH, 'utf8'));
            if (collections[positionDate]) {
                collectionInfo = collections[positionDate];
            }
        }

        // Expense Data
        if (fs.existsSync(PAYMENTS_PATH)) {
            const payments = JSON.parse(fs.readFileSync(PAYMENTS_PATH, 'utf8'));
            if (payments[positionDate]) {
                const dayPayments = payments[positionDate];
                Object.keys(dayPayments).forEach(bankId => {
                    dayPayments[bankId].forEach(p => {
                        if (p.category === 'Oil Companies') {
                            expenseInfo.oilExp += p.amount;
                        } else {
                            expenseInfo.otherExp += p.amount;
                        }
                    });
                });
                expenseInfo.totalExp = expenseInfo.oilExp + expenseInfo.otherExp;
                if (collectionInfo) {
                    expenseInfo.balance = collectionInfo.netCollection - expenseInfo.totalExp;
                }
            }
        }
    } catch (err) {
        console.error('Financial Report Data Error:', err);
    }

    res.render('financial-report', { 
        today, 
        positionDate, 
        bankData, 
        totalBankBalance,
        collectionInfo,
        expenseInfo
    });
});

module.exports = router;
