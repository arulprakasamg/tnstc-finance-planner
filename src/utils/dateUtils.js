/**
 * Date utility functions for TNSTC Finance Planner
 */

/**
 * Converts yyyy-mm-dd to dd/mm/yyyy
 * @param {string} ymd - Date string in yyyy-mm-dd format
 * @returns {string} - Date string in dd/mm/yyyy format
 */
const toDDMMYYYY = (ymd) => {
    if (!ymd) return "";
    const [y, m, d] = ymd.split('-');
    if (!y || !m || !d) return ymd; // Fallback
    return `${d}/${m}/${y}`;
};

/**
 * Converts dd/mm/yyyy to yyyy-mm-dd
 * @param {string} dmy - Date string in dd/mm/yyyy format
 * @returns {string} - Date string in yyyy-mm-dd format
 */
const ddmmyyyyToYmd = (dmy) => {
    if (!dmy) return "";
    const [d, m, y] = dmy.split('/');
    if (!d || !m || !y) return dmy; // Fallback
    return `${y}-${m}-${d}`;
};

/**
 * Converts yyyy-mm-dd to dd/mm/yyyy (alias for toDDMMYYYY)
 * @param {string} ymd - Date string in yyyy-mm-dd format
 * @returns {string} - Date string in dd/mm/yyyy format
 */
const ymdToDdmmyyyy = (ymd) => toDDMMYYYY(ymd);

module.exports = {
    toDDMMYYYY,
    ddmmyyyyToYmd,
    ymdToDdmmyyyy
};
