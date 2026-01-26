const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

/* ---------- SAFE READ ---------- */
function readJSON(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

/* ---------- ROUTE ---------- */
router.get('/', (req, res) => {

  // BACKEND USES dd/mm/yyyy ONLY
  const today = new Date().toLocaleDateString('en-GB');
  const positionDate = req.query.positionDate || today;

  try {
    /* FILE PATHS */
    const BANK_BAL_FILE = path.join(__dirname, '../data/bank_balances_daily.json');
    const BANK_MASTER_FILE = path.join(__dirname, '../data/bank_master.json');
    const COLLECTION_FILE = path.join(__dirname, '../data/daily_collections.json');
    const PAYMENT_FILE = path.join(__dirname, '../data/planned_payments.json');
    const HSD_FILE = path.join(__dirname, '../data/hsd_purchase.json');

    /* BANK ORDER (DISPLAY ORDER) */
    const BANK_ORDER = [
      'SBI – PLATINUM',
      'IOB – 5555',
      'I.B',
      'IOB – 42300',
      'IOB – 142300'
    ];

    /* ---------- BANK MASTER MAP ---------- */
    const bankMaster = readJSON(BANK_MASTER_FILE, []);
    const bankNameToId = {};

    bankMaster.forEach(b => {
      const displayName = `${b.bankName}`;
      bankNameToId[displayName] = b.id;
    });

    /* ---------- BANK BALANCES ---------- */
    const bankRaw = readJSON(BANK_BAL_FILE, {});
    const bankToday = bankRaw[positionDate] || {};

    let totalBankBalance = 0;

    const bankData = BANK_ORDER.map(name => {
      const bankId = bankNameToId[name];
      const balance = bankId ? Number(bankToday[bankId] || 0) : 0;
      totalBankBalance += balance;
      return { name, balance };
    });

    /* ---------- COLLECTION ---------- */
    const collectionRaw = readJSON(COLLECTION_FILE, {});
    const collectionInfo = collectionRaw[positionDate] || null;

    /* ---------- PAYMENTS ---------- */
    const paymentRaw = readJSON(PAYMENT_FILE, {});
    const paymentToday = Array.isArray(paymentRaw[positionDate])
      ? paymentRaw[positionDate]
      : [];

    let oilExp = 0;
    let otherExp = 0;
    const hsdPaymentsList = [];
    const otherPaymentsList = [];

    paymentToday.forEach(p => {
      const amt = Number(p.amount || 0);
      if (p.type === 'OIL') {
        oilExp += amt;
        hsdPaymentsList.push(p);
      } else {
        otherExp += amt;
        otherPaymentsList.push(p);
      }
    });

    const totalExp = oilExp + otherExp;
    const netCollection = collectionInfo
      ? Number(collectionInfo.netCollection || 0)
      : 0;

    const expenseInfo = {
      oilExp,
      otherExp,
      totalExp,
      balance: netCollection - totalExp
    };

    const hsdTotal = hsdPaymentsList.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );

    /* ---------- HSD OUTSTANDING ---------- */
    const hsdRaw = readJSON(HSD_FILE, []);

    const hsdArray = Array.isArray(hsdRaw)
      ? hsdRaw
      : Object.keys(hsdRaw || {}).map(date => ({ date, ...hsdRaw[date] }));

    const hsdOutstandingHistory = [];
    const hsdGrandTotals = {
      IOC: 0,
      BPC: 0,
      HPC: 0,
      Retail: 0,
      Ramnad: 0,
      CNG: 0,
      Total: 0
    };

    hsdArray.forEach(r => {
      const row = {
        formattedDate: r.date || '',
        IOC: Number(r.IOC || 0),
        BPC: Number(r.BPC || 0),
        HPC: Number(r.HPC || 0),
        Retail: Number(r.Retail || 0),
        Ramnad: Number(r.Ramnad || 0),
        CNG: Number(r.CNG || 0)
      };

      row.total =
        row.IOC + row.BPC + row.HPC +
        row.Retail + row.Ramnad + row.CNG;

      hsdOutstandingHistory.push(row);

      hsdGrandTotals.IOC += row.IOC;
      hsdGrandTotals.BPC += row.BPC;
      hsdGrandTotals.HPC += row.HPC;
      hsdGrandTotals.Retail += row.Retail;
      hsdGrandTotals.Ramnad += row.Ramnad;
      hsdGrandTotals.CNG += row.CNG;
      hsdGrandTotals.Total += row.total;
    });

    /* ---------- RENDER ---------- */
    res.render('financial-report', {
      positionDate,
      bankData,
      totalBankBalance,
      collectionInfo,
      expenseInfo,
      otherPaymentsList,
      hsdPaymentsList,
      hsdTotal,
      hsdOutstandingHistory,
      hsdGrandTotals
    });

  } catch (err) {
    console.error('Financial Report Error:', err);
    res.send('Financial Report Error');
  }
});

module.exports = router;