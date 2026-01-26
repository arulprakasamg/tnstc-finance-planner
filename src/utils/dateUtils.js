// src/utils/dateUtils.js

/**
 * Convert yyyy-mm-dd → dd/mm/yyyy
 * Example: 2026-01-23 → 23/01/2026
 */
function toDDMMYYYY(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';

  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';

  const [yyyy, mm, dd] = parts;
  if (!yyyy || !mm || !dd) return '';

  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Convert dd/mm/yyyy → yyyy-mm-dd
 * Example: 23/01/2026 → 2026-01-23
 */
function toYYYYMMDD(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';

  const parts = dateStr.split('/');
  if (parts.length !== 3) return '';

  const [dd, mm, yyyy] = parts;
  if (!yyyy || !mm || !dd) return '';

  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Normalize ANY input into dd/mm/yyyy
 * Accepts:
 * - yyyy-mm-dd
 * - dd/mm/yyyy
 */
function normalizeToDDMMYYYY(dateStr) {
  if (!dateStr) return '';

  if (dateStr.includes('-')) {
    return toDDMMYYYY(dateStr);
  }

  if (dateStr.includes('/')) {
    return dateStr;
  }

  return '';
}

module.exports = {
  toDDMMYYYY,
  toYYYYMMDD,
  normalizeToDDMMYYYY
};