const express = require('express');
const router = express.Router();

// Helper to get yesterday's date string
const getYesterdayDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
};

// Dashboard Page
router.get('/', (req, res) => {
    const dashboardMetrics = require('../data/dashboard_metrics.json');
    const yesterday = getYesterdayDate();
    
    const data = {
        bankBalance: dashboardMetrics.bankBalance,
        collection: dashboardMetrics.collection,
        hsdOutstanding: dashboardMetrics.hsdOutstanding,
        fromDate: yesterday,
        toDate: yesterday
    };
    
    res.render('index', { data });
});

module.exports = router;
