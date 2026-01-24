const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Sample Data
const dashboardMetrics = require('./src/data/dashboard_metrics.json');

// Helper to get yesterday's date string
const getYesterdayDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
};

// API Endpoint
app.get('/api/dashboard', (req, res) => {
    const yesterday = getYesterdayDate();
    const fromDate = req.query.fromDate || yesterday;
    const toDate = req.query.toDate || yesterday;

    // Mock range calculation
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const dayDiff = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
    const adjustedCollection = dashboardMetrics.collection * dayDiff;

    res.json({
        bankBalance: dashboardMetrics.bankBalance,
        bankBreakdown: dashboardMetrics.bankBreakdown || [],
        collection: adjustedCollection,
        hsdOutstanding: dashboardMetrics.hsdOutstanding,
        fromDate,
        toDate
    });
});

// Routes
const dashboardRoutes = require('./src/routes/dashboard');
app.use('/', dashboardRoutes);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`TNSTC Finance Planner running at http://0.0.0.0:${PORT}`);
});
