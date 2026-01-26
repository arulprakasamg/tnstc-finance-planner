const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const PLANNING_DATA_PATH = path.join(__dirname, '../data/payment_planning.json');
const MASTER_DATA_PATH = path.join(__dirname, '../data/bank_master.json');
const COLLECTIONS_DATA_PATH = path.join(__dirname, '../data/daily_collections.json');

/* ================================
   DATE HELPERS (dd/mm/yyyy ONLY)
================================ */
function normalizeToDDMMYYYY(input) {
    if (!input) return null;

    // already dd/mm/yyyy
    if (input.includes('/')) return input;

    // yyyy-mm-dd
    const [y, m, d] = input.split('-');
    if (y && m && d) return `${d}/${m}/${y}`;

    return null;
}

function getTodayDDMMYYYY() {
    return new Date().toLocaleDateString('en-GB'); // dd/mm/yyyy
}

/* ================================
   DATA HELPERS
================================ */
const getPlanning = () => {
    if (!fs.existsSync(PLANNING_DATA_PATH)) return {};
    try {
        return JSON.parse(fs.readFileSync(PLANNING_DATA_PATH, 'utf8') || '{}');
    } catch {
        return {};
    }
};

const savePlanning = (data) => {
    fs.writeFileSync(PLANNING_DATA_PATH, JSON.stringify(data, null, 2));
};

/* ================================
   GET PAYMENT PLANNING
================================ */
router.get('/', (req, res) => {
    const planning = getPlanning();
    const banks = fs.existsSync(MASTER_DATA_PATH)
        ? JSON.parse(fs.readFileSync(MASTER_DATA_PATH, 'utf8') || '[]')
        : [];

    const positionDate =
        normalizeToDDMMYYYY(req.query.positionDate) || getTodayDDMMYYYY();

    const bankId = req.query.bankId || (banks.length > 0 ? banks[0].id : null);

    /* -------- AVAILABLE FUND (Net Collection) -------- */
    let netCollection = 0;

    try {
        if (fs.existsSync(COLLECTIONS_DATA_PATH)) {
            const collections = JSON.parse(
                fs.readFileSync(COLLECTIONS_DATA_PATH, 'utf8') || '{}'
            );
            if (collections[positionDate]) {
                netCollection = Number(collections[positionDate].netCollection || 0);
            }
        }
    } catch (err) {
        console.error('Error calculating funds:', err);
    }

    const availableFund = netCollection;

    const allEntries = Array.isArray(planning[positionDate])
        ? planning[positionDate]
        : [];

    const entries = allEntries.filter(e => e.bankId === bankId);

    res.render('payment-planning', {
        entries,
        positionDate,
        bankId,
        banks,
        availableFund
    });
});

/* ================================
   SAVE PAYMENT PLANNING
================================ */
router.post('/save', (req, res) => {
    const body = req.body || {};
    const positionDate = normalizeToDDMMYYYY(body.positionDate);
    const bankId = body.bankId;
    const payments = Array.isArray(body.payments) ? body.payments : [];

    if (!positionDate || !bankId) {
        return res.status(400).json({ success: false });
    }

    const planning = getPlanning();

    if (!planning[positionDate]) planning[positionDate] = [];

    // Remove existing entries for same bank & date
    planning[positionDate] = planning[positionDate].filter(
        e => e.bankId !== bankId
    );

    const validPayments = payments
        .filter(p => parseFloat(p.amount) > 0)
        .map(p => ({
            category: p.category,
            subCategory: p.subCategory,
            amount: parseFloat(p.amount),
            bankId,
            updatedAt: getTodayDDMMYYYY()
        }));

    planning[positionDate].push(...validPayments);

    savePlanning(planning);

    res.json({ success: true });
});

module.exports = router;