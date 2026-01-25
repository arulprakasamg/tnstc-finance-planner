const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/hsd_purchase.json');

const getHsdData = () => {
    if (!fs.existsSync(DATA_PATH)) return {};
    try {
        return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8') || '{}');
    } catch (e) {
        return {};
    }
};

const saveHsdData = (data) => {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
};

const formatDate = (dateStr) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

router.get('/', (req, res) => {
    const data = getHsdData();
    const sortedDates = Object.keys(data).sort();
    const records = sortedDates.map(date => ({
        date,
        formattedDate: formatDate(date),
        ...data[date],
        total: Object.values(data[date]).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
    }));
    
    res.render('hsd-management', { records, today: new Date().toISOString().split('T')[0] });
});

router.post('/save', (req, res) => {
    const { date, companies } = req.body;
    const data = getHsdData();
    
    const entry = {};
    let hasValue = false;
    for (const [co, val] of Object.entries(companies)) {
        const num = parseFloat(val) || 0;
        if (num > 0) {
            entry[co] = num;
            hasValue = true;
        }
    }
    
    if (hasValue) {
        // Special case: field name in UI is "Retail" but table column is "Retail"
        // The data-cat in payment planning used "Retail / Confed"
        // Let's ensure we map the keys correctly if needed, but for now 
        // the form sends names like "IOC", "BPC", "HPC", "Retail", "Ramnad", "CNG"
        // and the table expects these keys.
        data[date] = entry;
        saveHsdData(data);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Please enter at least one amount' });
    }
});

router.post('/delete', (req, res) => {
    const { date } = req.body;
    const data = getHsdData();
    delete data[date];
    saveHsdData(data);
    res.json({ success: true });
});

module.exports = router;
