const fs = require('fs');
const path = require('path');
const { ddmmyyyyToYmd, toDDMMYYYY } = require('./dateUtils');

const MASTER_DATA_PATH = path.join(__dirname, '../data/bank_master.json');
const BALANCES_DATA_PATH = path.join(__dirname, '../data/bank_balances_daily.json');
const COLLECTIONS_PATH = path.join(__dirname, '../data/daily_collections.json');
const PAYMENTS_PATH = path.join(__dirname, '../data/payment_planning.json');
const HSD_DATA_PATH = path.join(__dirname, '../data/hsd_purchase.json');

/**
 * Gets the financial position for a specific date.
 * @param {string} positionDate - Date in dd/mm/yyyy format
 * @returns {Object} Structured finance position data
 */
function getFinancePosition(positionDate) {
    const result = {
        openingBalance: 0,
        bankBreakdown: [],
        netCollection: 0,
        collectionInfo: null,
        payments: {
            oil: 0,
            other: 0,
            total: 0,
            byCategory: {}
        },
        closingBalance: 0,
        hsdOutstanding: {
            IOC: 0, BPC: 0, HPC: 0, Retail: 0, Ramnad: 0, CNG: 0, Total: 0
        }
    };

    try {
        const banksMaster = JSON.parse(fs.readFileSync(MASTER_DATA_PATH, 'utf8'));
        const dailyBalances = JSON.parse(fs.readFileSync(BALANCES_DATA_PATH, 'utf8'));
        const availableDates = Object.keys(dailyBalances).sort((a, b) => ddmmyyyyToYmd(b).localeCompare(ddmmyyyyToYmd(a)));

        // 1. Opening Balance (Previous available balance before positionDate)
        const BANK_ORDER = ["SBI – PLATINUM", "IOB – 5555", "I.B", "IOB – 42300", "IOB – 142300"];
        
        result.bankBreakdown = BANK_ORDER.map(name => {
            const master = banksMaster.find(b => b.accountName === name || b.bankName === name);
            let balance = 0;
            if (master) {
                // Find most recent balance on or before positionDate
                const effectiveDate = availableDates.find(d => ddmmyyyyToYmd(d) <= ddmmyyyyToYmd(positionDate) && dailyBalances[d][master.id] !== undefined);
                if (effectiveDate) {
                    balance = Number(dailyBalances[effectiveDate][master.id]) || 0;
                }
            }
            result.openingBalance += balance;
            return { name, balance };
        });

        // 2. Net Collection
        if (fs.existsSync(COLLECTIONS_PATH)) {
            const collections = JSON.parse(fs.readFileSync(COLLECTIONS_PATH, 'utf8'));
            if (collections[positionDate]) {
                result.netCollection = Number(collections[positionDate].netCollection) || 0;
                result.collectionInfo = collections[positionDate];
            }
        }

        // 3. Planned Payments & 4. HSD Payments
        if (fs.existsSync(PAYMENTS_PATH)) {
            const planning = JSON.parse(fs.readFileSync(PAYMENTS_PATH, 'utf8'));
            if (planning[positionDate]) {
                planning[positionDate].forEach(p => {
                    const amount = Number(p.amount) || 0;
                    if (p.category === 'Oil Companies') {
                        result.payments.oil += amount;
                    } else {
                        result.payments.other += amount;
                    }
                    
                    if (!result.payments.byCategory[p.category]) {
                        result.payments.byCategory[p.category] = 0;
                    }
                    result.payments.byCategory[p.category] += amount;
                    result.payments.total += amount;
                });
            }
        }

        // 5. Closing Balance
        result.closingBalance = result.openingBalance + result.netCollection - result.payments.total;

        // HSD Outstanding (Helper for ledger)
        if (fs.existsSync(HSD_DATA_PATH)) {
            const hsdRaw = JSON.parse(fs.readFileSync(HSD_DATA_PATH, 'utf8'));
            Object.keys(hsdRaw).forEach(dateStr => {
                if (ddmmyyyyToYmd(toDDMMYYYY(dateStr)) <= ddmmyyyyToYmd(positionDate)) {
                    const entry = hsdRaw[dateStr];
                    result.hsdOutstanding.IOC += Number(entry.IOC) || 0;
                    result.hsdOutstanding.BPC += Number(entry.BPC) || 0;
                    result.hsdOutstanding.HPC += Number(entry.HPC) || 0;
                    result.hsdOutstanding.Retail += Number(entry.Retail) || 0;
                    result.hsdOutstanding.Ramnad += Number(entry.Ramnad) || 0;
                    result.hsdOutstanding.CNG += Number(entry.CNG) || 0;
                }
            });
            result.hsdOutstanding.Total = result.hsdOutstanding.IOC + result.hsdOutstanding.BPC + result.hsdOutstanding.HPC + 
                                         result.hsdOutstanding.Retail + result.hsdOutstanding.Ramnad + result.hsdOutstanding.CNG;
        }

    } catch (err) {
        console.error('getFinancePosition Error:', err);
    }

    return result;
}

module.exports = { getFinancePosition };
