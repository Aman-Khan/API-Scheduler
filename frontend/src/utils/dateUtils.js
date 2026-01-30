import { format, parseISO } from 'date-fns';

export const formatDateTime = (isoString) => {
  if (!isoString) return 'N/A';
  try {
    return format(parseISO(isoString), 'MMM dd, yyyy HH:mm:ss');
  } catch (error) {
    return isoString;
  }
};

export const formatDate = (isoString) => {
  if (!isoString) return 'N/A';
  try {
    return format(parseISO(isoString), 'MMM dd, yyyy');
  } catch (error) {
    return isoString;
  }
};