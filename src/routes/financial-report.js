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

    // Map financePos to existing view variables for compatibility
    const bankData = financePos.bankBreakdown;
    const totalBankBalance = financePos.openingBalance;
    const collectionInfo = financePos.collectionInfo;
    const expenseInfo = {
        oilExp: financePos.payments.oil,
        otherExp: financePos.payments.other,
        totalExp: financePos.payments.total,
        balance: (financePos.collectionInfo ? financePos.collectionInfo.netCollection : 0) - financePos.payments.total
    };

    // Prepare otherPaymentsList and hsdPaymentsList as before
    let otherPaymentsList = [];
    const PAYMENTS_PATH = path.join(__dirname, '../data/payment_planning.json');
    if (fs.existsSync(PAYMENTS_PATH)) {
        const planning = JSON.parse(fs.readFileSync(PAYMENTS_PATH, 'utf8'));
        if (planning[positionDate]) {
            planning[positionDate].forEach(p => {
                if (p.category !== 'Oil Companies') {
                    const existing = otherPaymentsList.find(item => item.subCategory === p.subCategory);
                    if (existing) { existing.amount += p.amount; }
                    else { otherPaymentsList.push({ subCategory: p.subCategory, amount: p.amount }); }
                }
            });
        }
    }

    let hsdPaymentsList = [];
    let hsdTotal = 0;
    const HSD_DATA_PATH = path.join(__dirname, '../data/hsd_purchase.json');
    if (fs.existsSync(HSD_DATA_PATH)) {
        const hsdRaw = JSON.parse(fs.readFileSync(HSD_DATA_PATH, 'utf8'));
        const record = hsdRaw[positionDate] || hsdRaw[ddmmyyyyToYmd(positionDate)];
        const HSD_ORDER = ["IOC", "BPC", "HPC", "Retail", "Ramnad", "CNG"];
        const HSD_DISPLAY_NAMES = {
            "IOC": "IOC", "BPC": "BPC", "HPC": "HPC",
            "Retail": "Retail / Confed", "Ramnad": "Ramnad", "CNG": "CNG"
        };
        hsdPaymentsList = HSD_ORDER.map(key => {
            const amount = record ? (Number(record[key]) || 0) : 0;
            hsdTotal += amount;
            return { name: HSD_DISPLAY_NAMES[key], amount };
        });
    }

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
