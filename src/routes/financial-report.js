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
    const HSD_DATA_PATH = path.join(__dirname, '../data/hsd_purchase.json');

    let bankData = [];
    let totalBankBalance = 0;
    let collectionInfo = null;
    let expenseInfo = {
        oilExp: 0,
        otherExp: 0,
        totalExp: 0,
        balance: 0
    };
    let otherPaymentsList = [];
    let hsdPaymentsList = [];
    let hsdTotal = 0;
    let hsdOutstandingHistory = [];
    let hsdGrandTotals = {
        IOC: 0, BPC: 0, HPC: 0, Retail: 0, Ramnad: 0, CNG: 0, Total: 0
    };

    try {
        const banksMaster = JSON.parse(fs.readFileSync(MASTER_DATA_PATH, 'utf8'));
        const dailyBalances = JSON.parse(fs.readFileSync(BALANCES_DATA_PATH, 'utf8'));
        const availableDates = Object.keys(dailyBalances).sort();

        // IMPLEMENTATION: Use Position Date to fetch bank balances
        bankData = BANK_ORDER.map(name => {
            const master = banksMaster.find(b => b.bankName === name);
            let balance = 0;
            if (master) {
                // Find the latest balance on or before the selected Position Date
                const effectiveDate = availableDates.slice().reverse().find(d => d <= positionDate && dailyBalances[d][master.id] !== undefined);
                if (effectiveDate) balance = dailyBalances[effectiveDate][master.id];
            }
            totalBankBalance += balance;
            return { name, balance };
        });
        
        console.log(`Financial Report Bank Data for ${positionDate}:`, JSON.stringify(bankData));
        if (bankData.length === 0) console.warn('Financial Report: Bank data array is empty!');

        // Collection Data
        if (fs.existsSync(COLLECTIONS_PATH)) {
            const collections = JSON.parse(fs.readFileSync(COLLECTIONS_PATH, 'utf8'));
            if (collections[positionDate]) {
                collectionInfo = collections[positionDate];
            }
        }

        // HSD Data
        if (fs.existsSync(HSD_DATA_PATH)) {
            const hsdData = JSON.parse(fs.readFileSync(HSD_DATA_PATH, 'utf8'));
            
            // 1. Current day breakdown for payments column
            const record = hsdData.find(r => r.date === positionDate);
            const HSD_ORDER = ["IOC", "BPC", "HPC", "Retail", "Ramnad", "CNG"];
            const HSD_DISPLAY_NAMES = {
                "IOC": "IOC",
                "BPC": "BPC",
                "HPC": "HPC",
                "Retail": "Retail / Confed",
                "Ramnad": "Ramnad",
                "CNG": "CNG"
            };

            hsdPaymentsList = HSD_ORDER.map(key => {
                const amount = record ? (record[key] || 0) : 0;
                hsdTotal += amount;
                return { name: HSD_DISPLAY_NAMES[key], amount };
            });

            // 2. Historical outstanding up to positionDate
            hsdOutstandingHistory = hsdData
                .filter(r => r.date <= positionDate)
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .map(r => {
                    const rowTotal = (r.IOC || 0) + (r.BPC || 0) + (r.HPC || 0) + (r.Retail || 0) + (r.Ramnad || 0) + (r.CNG || 0);
                    
                    hsdGrandTotals.IOC += (r.IOC || 0);
                    hsdGrandTotals.BPC += (r.BPC || 0);
                    hsdGrandTotals.HPC += (r.HPC || 0);
                    hsdGrandTotals.Retail += (r.Retail || 0);
                    hsdGrandTotals.Ramnad += (r.Ramnad || 0);
                    hsdGrandTotals.CNG += (r.CNG || 0);
                    hsdGrandTotals.Total += rowTotal;

                    const [y, m, d] = r.date.split('-');
                    return {
                        ...r,
                        formattedDate: `${d}/${m}/${y}`,
                        total: rowTotal
                    };
                });
        }

        // Expense Data
        if (fs.existsSync(PAYMENTS_PATH)) {
            const payments = JSON.parse(fs.readFileSync(PAYMENTS_PATH, 'utf8'));
            if (payments[positionDate]) {
                const dayPayments = payments[positionDate];
                
                // Get all payments across all banks for this day
                const allPayments = [];
                Object.keys(dayPayments).forEach(bankId => {
                    dayPayments[bankId].forEach(p => {
                        allPayments.push(p);
                    });
                });

                allPayments.forEach(p => {
                    if (p.category === 'Oil Companies') {
                        expenseInfo.oilExp += p.amount;
                    } else {
                        expenseInfo.otherExp += p.amount;
                        // For Other Payments, we want to keep them in order of appearance
                        const existing = otherPaymentsList.find(item => item.subCategory === p.subCategory);
                        if (existing) {
                            existing.amount += p.amount;
                        } else {
                            otherPaymentsList.push({ subCategory: p.subCategory, amount: p.amount });
                        }
                    }
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
        expenseInfo,
        otherPaymentsList,
        hsdPaymentsList,
        hsdTotal,
        hsdOutstandingHistory,
        hsdGrandTotals,
        BANK_ORDER
    });
});

router.get('/api/bank-balances', (req, res) => {
    const positionDate = req.query.positionDate || new Date().toISOString().split('T')[0];
    const MASTER_DATA_PATH = path.join(__dirname, '../data/bank_master.json');
    const BALANCES_DATA_PATH = path.join(__dirname, '../data/bank_balances_daily.json');
    const BANK_ORDER = [
        "SBI – PLATINUM",
        "IOB – 5555",
        "I.B",
        "IOB – 42300",
        "IOB – 142300"
    ];

    try {
        const banksMaster = JSON.parse(fs.readFileSync(MASTER_DATA_PATH, 'utf8'));
        const dailyBalances = JSON.parse(fs.readFileSync(BALANCES_DATA_PATH, 'utf8'));
        
        // Match Dashboard Logic: Filter and find latest available balance on or before positionDate
        const availableDates = Object.keys(dailyBalances)
            .filter(date => date <= positionDate)
            .sort();

        let totalBalance = 0;
        const breakdown = BANK_ORDER.map(name => {
            const master = banksMaster.find(b => b.bankName === name);
            let balance = 0;
            if (master) {
                // Find most recent balance entry across all available dates <= positionDate
                const effectiveDate = availableDates.slice().reverse().find(d => dailyBalances[d][master.id] !== undefined);
                if (effectiveDate) balance = dailyBalances[effectiveDate][master.id];
            }
            totalBalance += balance;
            return { name, balance };
        });

        res.json({
            bankBalance: totalBalance,
            bankBreakdown: breakdown
        });
    } catch (err) {
        console.error('Financial Report Bank API Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
