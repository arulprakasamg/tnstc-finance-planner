const express = require('express');
const router = express.Router();

const fs = require('fs');
const path = require('path');

// Helper to get yesterday's date string
const getYesterdayDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
};

// Required Display Order for Banks
const BANK_ORDER = [
    "SBI – PLATINUM",
    "IOB – 5555",
    "I.B",
    "IOB – 42300",
    "IOB – 142300"
];

const MASTER_DATA_PATH = path.join(__dirname, '../data/bank_master.json');
const BALANCES_DATA_PATH = path.join(__dirname, '../data/bank_balances_daily.json');

// Dashboard Page
router.get('/', (req, res) => {
    const dashboardMetrics = require('../data/dashboard_metrics.json');
    const yesterday = getYesterdayDate();
    
    // Default to yesterday if not provided
    const fromDate = req.query.fromDate || yesterday;
    const toDate = req.query.toDate || yesterday;
    
    // Read live data
    const banksMaster = JSON.parse(fs.readFileSync(MASTER_DATA_PATH, 'utf8'));
    const dailyBalances = JSON.parse(fs.readFileSync(BALANCES_DATA_PATH, 'utf8'));
    
    // Sort dates to find the latest balance on or before toDate
    const availableDates = Object.keys(dailyBalances).sort();

    // Calculate live bank balances using rolling logic
    let totalLiveBankBalance = 0;
    const liveBankBreakdown = BANK_ORDER.map(bankName => {
        const bankInfo = banksMaster.find(b => b.bankName === bankName);
        let balance = 0;
        
        if (bankInfo) {
            // Find most recent balance on or before toDate
            const effectiveDate = availableDates.slice().reverse().find(d => d <= toDate && dailyBalances[d][bankInfo.id] !== undefined);
            if (effectiveDate) {
                balance = dailyBalances[effectiveDate][bankInfo.id];
            }
        }
        
        totalLiveBankBalance += balance;
        return { name: bankName, balance: balance };
    });
    
    // Simulate collection calculation based on date range
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const dayDiff = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
    
    const adjustedCollection = dashboardMetrics.collection * (dayDiff > 0 ? dayDiff : 1);

    const data = {
        bankBalance: totalLiveBankBalance,
        bankBreakdown: liveBankBreakdown,
        collection: adjustedCollection,
        hsdOutstanding: dashboardMetrics.hsdOutstanding,
        fromDate,
        toDate
    };
    
    res.render('index', { data });
});

module.exports = router;
