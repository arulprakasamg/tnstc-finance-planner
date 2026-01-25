const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    res.render('financial-report', { today });
});

module.exports = router;
