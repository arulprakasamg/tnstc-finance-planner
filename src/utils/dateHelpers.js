const toBackendFormat = (yyyymmdd) => {
  if (!yyyymmdd || typeof yyyymmdd !== 'string') {
    return null;
  }

  const match = yyyymmdd.match(/^\d{4}-\d{2}-\d{2}$/);
  if (!match) {
    return null;
  }

  const [year, month, day] = yyyymmdd.split('-');
  return `${day}/${month}/${year}`;
};

const toInputFormat = (ddmmyyyy) => {
  if (!ddmmyyyy || typeof ddmmyyyy !== 'string') {
    return null;
  }

  const match = ddmmyyyy.match(/^\d{2}\/\d{2}\/\d{4}$/);
  if (!match) {
    return null;
  }

  const [day, month, year] = ddmmyyyy.split('/');
  return `${year}-${month}-${day}`;
};

const getTodayBackend = () => {
  const today = new Date().toISOString().split('T')[0];
  return toBackendFormat(today);
};

const getTodayInput = () => {
  return new Date().toISOString().split('T')[0];
};

const isValidDateFormat = (dateStr, format) => {
  if (!dateStr || typeof dateStr !== 'string') {
    return false;
  }

  if (format === 'yyyy-mm-dd') {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  }

  if (format === 'dd/mm/yyyy') {
    return /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr);
  }

  return false;
};

module.exports = {
  toBackendFormat,
  toInputFormat,
  getTodayBackend,
  getTodayInput,
  isValidDateFormat
};
