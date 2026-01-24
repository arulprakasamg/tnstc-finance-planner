const express = require('express');
const router = express.Router();
const sampleData = require('../data/sample_finance.json');

// Dashboard Page
router.get('/', (req, res) => {
  res.render('index', { data: sampleData });
});

// API endpoint for dynamic updates
router.get('/api/finance-summary', (req, res) => {
  res.json(sampleData);
});

module.exports = router;
