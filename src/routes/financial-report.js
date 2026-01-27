const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { toDDMMYYYY, ddmmyyyyToYmd } = require('../utils/dateUtils');

router.get('/', (req, res) => {
    const rawToday = new Date().toISOString().split('T')[0];
    const today = toDDMMYYYY(rawToday);
    const positionDate = req.query.positionDate ? toDDMMYYYY(req.query.positionDate) : today;

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
    const PAYMENTS_PATH = path.join(__dirname, '../data/payment_planning.json');
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
        
        // Sort dates correctly for carry-forward logic
        const availableDates = Object.keys(dailyBalances).sort((a, b) => {
            return ddmmyyyyToYmd(b).localeCompare(ddmmyyyyToYmd(a));
        });

        // Bank Balance logic with Carry Forward
        bankData = BANK_ORDER.map(name => {
            const master = banksMaster.find(b => b.bankName === name);
            let balance = 0;
            if (master) {
                if (dailyBalances[positionDate] && dailyBalances[positionDate][master.id] !== undefined) {
                    balance = dailyBalances[positionDate][master.id];
                } else {
                    const previousDate = availableDates.find(d => ddmmyyyyToYmd(d) < ddmmyyyyToYmd(positionDate) && dailyBalances[d][master.id] !== undefined);
                    if (previousDate) balance = dailyBalances[previousDate][master.id];
                }
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

        // HSD Data
        if (fs.existsSync(HSD_DATA_PATH)) {
            const hsdRaw = JSON.parse(fs.readFileSync(HSD_DATA_PATH, 'utf8'));
            let hsdArray = [];
            if (Array.isArray(hsdRaw)) {
                hsdArray = hsdRaw;
            } else {
                hsdArray = Object.keys(hsdRaw).map(date => ({
                    date: date,
                    ...hsdRaw[date]
                }));
            }
            
            const record = hsdArray.find(r => r.date === positionDate);
            const HSD_ORDER = ["IOC", "BPC", "HPC", "Retail", "Ramnad", "CNG"];
            const HSD_DISPLAY_NAMES = {
                "IOC": "IOC", "BPC": "BPC", "HPC": "HPC",
                "Retail": "Retail / Confed", "Ramnad": "Ramnad", "CNG": "CNG"
            };

            hsdPaymentsList = HSD_ORDER.map(key => {
                const amount = record ? (record[key] || 0) : 0;
                hsdTotal += amount;
                return { name: HSD_DISPLAY_NAMES[key], amount };
            });

            hsdOutstandingHistory = hsdArray
                .filter(r => ddmmyyyyToYmd(r.date) <= ddmmyyyyToYmd(positionDate))
                .sort((a, b) => ddmmyyyyToYmd(a.date).localeCompare(ddmmyyyyToYmd(b.date)))
                .map(r => {
                    const rowTotal = (r.IOC || 0) + (r.BPC || 0) + (r.HPC || 0) + (r.Retail || 0) + (r.Ramnad || 0) + (r.CNG || 0);
                    hsdGrandTotals.IOC += (r.IOC || 0);
                    hsdGrandTotals.BPC += (r.BPC || 0);
                    hsdGrandTotals.HPC += (r.HPC || 0);
                    hsdGrandTotals.Retail += (r.Retail || 0);
                    hsdGrandTotals.Ramnad += (r.Ramnad || 0);
                    hsdGrandTotals.CNG += (r.CNG || 0);
                    hsdGrandTotals.Total += rowTotal;
                    return { ...r, formattedDate: r.date, total: rowTotal };
                });
        }

        // Expense Data (Planned Payments)
        if (fs.existsSync(PAYMENTS_PATH)) {
            const planning = JSON.parse(fs.readFileSync(PAYMENTS_PATH, 'utf8'));
            if (planning[positionDate]) {
                planning[positionDate].forEach(p => {
                    if (p.category === 'Oil Companies') {
                        expenseInfo.oilExp += p.amount;
                    } else {
                        expenseInfo.otherExp += p.amount;
                        const existing = otherPaymentsList.find(item => item.subCategory === p.subCategory);
                        if (existing) { existing.amount += p.amount; }
                        else { otherPaymentsList.push({ subCategory: p.subCategory, amount: p.amount }); }
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
        today, positionDate, bankData, totalBankBalance,
        collectionInfo, expenseInfo, otherPaymentsList,
        hsdPaymentsList, hsdTotal, hsdOutstandingHistory, hsdGrandTotals
    });
});

module.exports = router;
