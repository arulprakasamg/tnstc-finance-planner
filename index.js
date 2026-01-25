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

// Helper to get today's date string
const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
};

// API Endpoint
app.get('/api/dashboard', (req, res) => {
    const fs = require('fs');
    const today = getTodayDate();
    const fromDate = req.query.fromDate || today;
    const toDate = req.query.toDate || today;

    const MASTER_DATA_PATH = path.join(__dirname, 'src/data/bank_master.json');
    const BALANCES_DATA_PATH = path.join(__dirname, 'src/data/bank_balances_daily.json');

    // Required Display Order
    const BANK_ORDER = [
        "SBI – PLATINUM",
        "IOB – 5555",
        "I.B",
        "IOB – 42300",
        "IOB – 142300"
    ];

    try {
        const banksMaster = JSON.parse(fs.readFileSync(MASTER_DATA_PATH, 'utf8'));
        const dailyBalances = JSON.parse(fs.readFileSync(BALANCES_DATA_PATH, 'utf8'));
        const availableDates = Object.keys(dailyBalances).sort();

        let totalBalance = 0;
        const breakdown = BANK_ORDER.map(name => {
            const master = banksMaster.find(b => b.bankName === name);
            let balance = 0;
            if (master) {
                const effectiveDate = availableDates.slice().reverse().find(d => d <= toDate && dailyBalances[d][master.id] !== undefined);
                if (effectiveDate) balance = dailyBalances[effectiveDate][master.id];
            }
            totalBalance += balance;
            return { name, balance };
        });

        const start = new Date(fromDate);
        const end = new Date(toDate);
        
        // Fetch Live Collection Data
        const COLLECTIONS_DATA_PATH = path.join(__dirname, 'src/data/daily_collections.json');
        let totalCollection = 0;
        try {
            if (fs.existsSync(COLLECTIONS_DATA_PATH)) {
                const collections = JSON.parse(fs.readFileSync(COLLECTIONS_DATA_PATH, 'utf8'));
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const dateStr = d.toISOString().split('T')[0];
                    if (collections[dateStr]) {
                        totalCollection += collections[dateStr].netCollection || 0;
                    }
                }
            }
        } catch (err) {
            console.error('Dashboard API Collection Error:', err);
        }

        res.json({
            bankBalance: totalBalance,
            bankBreakdown: breakdown,
            collection: totalCollection,
            hsdOutstanding: dashboardMetrics.hsdOutstanding,
            fromDate,
            toDate
        });
    } catch (err) {
        console.error('Dashboard API Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Routes
const dashboardRoutes = require('./src/routes/dashboard');
const bankBalancesRoutes = require('./src/routes/bank-balances');
const dailyCollectionsRoutes = require('./src/routes/daily-collections');
const paymentPlanningRoutes = require('./src/routes/payment-planning');
const hsdManagementRoutes = require('./src/routes/hsd-management');
const financialReportRoutes = require('./src/routes/financial-report');

app.use('/', dashboardRoutes);
app.use('/bank-balances', bankBalancesRoutes);
app.use('/daily-collections', dailyCollectionsRoutes);
app.use('/payment-planning', paymentPlanningRoutes);
app.use('/hsd-management', hsdManagementRoutes);
app.use('/financial-report', financialReportRoutes);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`TNSTC Finance Planner running at http://0.0.0.0:${PORT}`);
});
