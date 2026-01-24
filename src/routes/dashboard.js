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
    
    // Default to yesterday if not provided
    const fromDate = req.query.fromDate || yesterday;
    const toDate = req.query.toDate || yesterday;
    
    // Simulate collection calculation based on date range
    // In a real app, this would be a DB query sum
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const dayDiff = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
    
    // Mock calculation: daily collection * number of days
    const adjustedCollection = dashboardMetrics.collection * (dayDiff > 0 ? dayDiff : 1);

    const data = {
        bankBalance: dashboardMetrics.bankBalance,
        collection: adjustedCollection,
        hsdOutstanding: dashboardMetrics.hsdOutstanding,
        fromDate,
        toDate
    };
    
    res.render('index', { data });
});

module.exports = router;
