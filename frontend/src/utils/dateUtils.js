// utils/dateUtils.js
export const formatDateTime = (isoString) => {
  if (!isoString) return '—';
  
  const date = new Date(isoString);
  
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};
