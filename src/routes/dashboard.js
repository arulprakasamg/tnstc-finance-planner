const express = require('express');
const router = express.Router();

const fs = require('fs');
const path = require('path');

// Helper to get today's date string
const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
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
    const today = getTodayDate();
    
    // Default to today if not provided
    const fromDate = req.query.fromDate || today;
    const toDate = req.query.toDate || today;
    
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
    
    // Calculate collection for date range
    const collectionsDataPath = path.join(__dirname, '../data/daily_collections.json');
    let totalCollection = 0;
    try {
        if (fs.existsSync(collectionsDataPath)) {
            const collections = JSON.parse(fs.readFileSync(collectionsDataPath, 'utf8'));
            const start = new Date(fromDate);
            const end = new Date(toDate);
            
            // Loop through dates in range and sum Net Collection
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                if (collections[dateStr]) {
                    totalCollection += collections[dateStr].netCollection || 0;
                }
            }
        }
    } catch (err) {
        console.error('Error reading collections for dashboard:', err);
    }

    // Calculate HSD Outstanding
    const hsdDataPath = path.join(__dirname, '../data/hsd_purchase.json');
    let hsdTotal = 0;
    const hsdCompanyWise = {
        IOC: 0, BPC: 0, HPC: 0, Retail: 0, Ramnad: 0, CNG: 0
    };
    
    try {
        if (fs.existsSync(hsdDataPath)) {
            const hsdData = JSON.parse(fs.readFileSync(hsdDataPath, 'utf8'));
            Object.values(hsdData).forEach(entry => {
                Object.keys(hsdCompanyWise).forEach(co => {
                    const val = parseFloat(entry[co]) || 0;
                    hsdCompanyWise[co] += val;
                    hsdTotal += val;
                });
            });
        }
    } catch (err) {
        console.error('Error reading HSD data for dashboard:', err);
    }

    const data = {
        bankBalance: totalLiveBankBalance,
        bankBreakdown: liveBankBreakdown,
        collection: totalCollection,
        hsdOutstanding: hsdTotal,
        hsdBreakdown: hsdCompanyWise,
        fromDate,
        toDate
    };
    
    res.render('index', { data });
});

module.exports = router;
