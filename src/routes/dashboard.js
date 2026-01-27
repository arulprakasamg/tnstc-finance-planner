const express = require('express');
const router = express.Router();

const fs = require('fs');
const path = require('path');

const { toDDMMYYYY, ddmmyyyyToYmd } = require('../utils/dateUtils');

// Helper to get today's date string in dd/mm/yyyy
const getTodayDate = () => {
    return toDDMMYYYY(new Date().toISOString().split('T')[0]);
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
    const today = getTodayDate();
    
    // Position Date logic: handle yyyy-mm-dd from query and convert to dd/mm/yyyy
    let positionDate = req.query.toDate ? toDDMMYYYY(req.query.toDate) : today;
    const fromDateInput = req.query.fromDate || ddmmyyyyToYmd(positionDate);
    const toDateInput = req.query.toDate || ddmmyyyyToYmd(positionDate);
    
    // Read live data
    const banksMaster = JSON.parse(fs.readFileSync(MASTER_DATA_PATH, 'utf8'));
    const dailyBalances = JSON.parse(fs.readFileSync(BALANCES_DATA_PATH, 'utf8'));
    
    // Sort dates to find the latest balance on or before positionDate
    const availableDates = Object.keys(dailyBalances).sort((a, b) => ddmmyyyyToYmd(a).localeCompare(ddmmyyyyToYmd(b)));

    // Calculate live bank balances using rolling logic
    let totalLiveBankBalance = 0;
    const liveBankBreakdown = BANK_ORDER.map(bankName => {
        const bankInfo = banksMaster.find(b => b.bankName === bankName || b.accountName === bankName);
        let balance = 0;
        
        if (bankInfo) {
            // Find most recent balance on or before positionDate
            const effectiveDate = availableDates.slice().reverse().find(d => ddmmyyyyToYmd(d) <= ddmmyyyyToYmd(positionDate) && dailyBalances[d][bankInfo.id] !== undefined);
            if (effectiveDate) {
                balance = Number(dailyBalances[effectiveDate][bankInfo.id]) || 0;
            }
        }
        
        totalLiveBankBalance += balance;
        return { name: bankName, balance: balance };
    });
    
    // Calculate collection for selected positionDate
    const collectionsDataPath = path.join(__dirname, '../data/daily_collections.json');
    let netCollection = 0;
    let grossCollection = 0;
    let batta = 0;
    let pos = 0;
    let collFromDate = "";
    let collToDate = "";

    try {
        if (fs.existsSync(collectionsDataPath)) {
            const collections = JSON.parse(fs.readFileSync(collectionsDataPath, 'utf8'));
            if (collections[positionDate]) {
                netCollection = collections[positionDate].netCollection || 0;
                grossCollection = collections[positionDate].grossCollection || 0;
                batta = collections[positionDate].batta || 0;
                pos = collections[positionDate].posCharges || 0;
                collFromDate = collections[positionDate].fromDate;
                collToDate = collections[positionDate].toDate;
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
        collection: netCollection,
        collectionGross: grossCollection,
        collectionBatta: batta,
        collectionPos: pos,
        hsdOutstanding: hsdTotal,
        hsdBreakdown: hsdCompanyWise,
        fromDate: fromDateInput,
        toDate: toDateInput,
        collFromDate: collFromDate,
        collToDate: collToDate
    };
    
    res.render('index', { data });
});

module.exports = router;
