const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { toDDMMYYYY, ddmmyyyyToYmd } = require('../utils/dateUtils');
const { getFinancePosition, getHSDOutstanding } = require('../utils/financeUtils');

router.get('/', (req, res) => {
    const rawToday = new Date().toISOString().split('T')[0];
    const today = toDDMMYYYY(rawToday);
    const positionDate = req.query.positionDate ? toDDMMYYYY(req.query.positionDate) : today;

    const financePos = getFinancePosition(positionDate);
    const hsdOutstandingPayments = getHSDOutstanding();

    // Prepare HSD PAYMENTS and Other Payments from payment_planning.json
    let hsdPaymentsList = [];
    let hsdTotal = 0;
    let otherPaymentsList = [];
    let otherTotal = 0;

    const PAYMENTS_PATH = path.join(__dirname, '../data/payment_planning.json');
    if (fs.existsSync(PAYMENTS_PATH)) {
        const planning = JSON.parse(fs.readFileSync(PAYMENTS_PATH, 'utf8'));
        if (planning[positionDate]) {
            const HSD_ORDER = ["IOC", "BPC", "HPC", "Retail / Confed", "Ramnad", "CNG"];
            const hsdGrouped = {
                "IOC": 0, "BPC": 0, "HPC": 0, "Retail / Confed": 0, "Ramnad": 0, "CNG": 0
            };

            planning[positionDate].forEach(p => {
                const amount = Number(p.amount) || 0;
                if (p.category === 'Oil Companies') {
                    if (hsdGrouped.hasOwnProperty(p.subCategory)) {
                        hsdGrouped[p.subCategory] += amount;
                    } else if (p.subCategory === 'Retail') {
                        hsdGrouped["Retail / Confed"] += amount;
                    }
                    hsdTotal += amount;
                } else {
                    const existing = otherPaymentsList.find(item => item.subCategory === p.subCategory);
                    if (existing) {
                        existing.amount += amount;
                    } else {
                        otherPaymentsList.push({ subCategory: p.subCategory, amount: amount });
                    }
                    otherTotal += amount;
                }
            });

            hsdPaymentsList = HSD_ORDER.map(name => ({
                name,
                amount: hsdGrouped[name]
            }));
        }
    }

    // Map financePos to existing view variables for compatibility
    const bankData = financePos.bankBreakdown;
    const totalBankBalance = financePos.openingBalance;
    const collectionInfo = financePos.collectionInfo;
    const expenseInfo = {
        oilExp: hsdTotal,
        otherExp: otherTotal,
        totalExp: hsdTotal + otherTotal,
        balance: (financePos.collectionInfo ? Number(financePos.collectionInfo.netCollection) : 0) - (hsdTotal + otherTotal)
    };

    // Prepare hsdOutstandingHistory (Date-wise purchase outstanding)
    let hsdOutstandingHistory = financePos.hsdOutstandingHistory || [];
    let hsdGrandTotals = financePos.hsdOutstanding;

    res.render('financial-report', { 
        today, positionDate, bankData, totalBankBalance,
        collectionInfo, expenseInfo, otherPaymentsList,
        hsdPaymentsList, hsdTotal, hsdOutstandingHistory, hsdGrandTotals,
        hsdOutstandingPayments, hsdOutstanding: hsdOutstandingHistory
    });
});

module.exports = router;
