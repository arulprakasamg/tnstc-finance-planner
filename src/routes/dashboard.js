const express = require('express');
const router = express.Router();

const fs = require('fs');
const path = require('path');

const { toDDMMYYYY, ddmmyyyyToYmd } = require('../utils/dateUtils');

// Helper to get today's date string in dd/mm/yyyy
const getTodayDate = () => {
    return toDDMMYYYY(new Date().toISOString().split('T')[0]);
};

const MASTER_DATA_PATH = path.join(__dirname, '../data/bank_master.json');
const BALANCES_DATA_PATH = path.join(__dirname, '../data/bank_balances_daily.json');

// Dashboard Page
router.get('/', (req, res) => {
    const today = getTodayDate();
    
    // Position Date logic: handle yyyy-mm-dd from query and convert to dd/mm/yyyy
    let positionDate = req.query.toDate ? toDDMMYYYY(req.query.toDate) : today;
    const fromDateInput = req.query.fromDate || ddmmyyyyToYmd(positionDate);
    const toDateInput = req.query.toDate || ddmmyyyyToYmd(positionDate);
    
    const { getFinancePosition, formatBankBalance } = require('../utils/financeUtils');
    const financeData = getFinancePosition(positionDate);

    const data = {
        bankBalance: financeData.openingBalance,
        bankBalanceFormatted: formatBankBalance(financeData.openingBalance),
        bankBreakdown: financeData.bankBreakdown,
        collection: financeData.netCollection,
        collectionGross: financeData.collectionInfo?.grossCollection || 0,
        collectionBatta: financeData.collectionInfo?.batta || 0,
        collectionPos: financeData.collectionInfo?.posCharges || 0,
        hsdOutstanding: financeData.hsdOutstanding.Total,
        hsdBreakdown: {
            IOC: financeData.hsdOutstanding.IOC,
            BPC: financeData.hsdOutstanding.BPC,
            HPC: financeData.hsdOutstanding.HPC,
            Retail: financeData.hsdOutstanding.Retail,
            Ramnad: financeData.hsdOutstanding.Ramnad,
            CNG: financeData.hsdOutstanding.CNG
        },
        fromDate: fromDateInput,
        toDate: toDateInput,
        collFromDate: financeData.collectionInfo?.fromDate || "",
        collToDate: financeData.collectionInfo?.toDate || ""
    };
    
    res.render('index', { data });
});

module.exports = router;
