import { format, formatDistanceToNow, parseISO, isValid, type Locale } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { es } from 'date-fns/locale/es';
import { zhCN } from 'date-fns/locale/zh-CN';
import { fr } from 'date-fns/locale/fr';
import { de } from 'date-fns/locale/de';
import { ro } from 'date-fns/locale/ro';
import i18n from '@/i18n/config';

// Map i18n language codes to date-fns locales
const localeMap: Record<string, Locale> = {
  en: enUS,
  es: es,
  zh: zhCN,
  fr: fr,
  de: de,
  ro: ro,
};

/**
 * Get the current locale for date formatting based on i18n language
 */
export const getDateLocale = (): Locale => {
  const lang = i18n.language?.split('-')[0] || 'en';
  return localeMap[lang] || enUS;
};

/**
 * Format a date string or Date object to a localized string
 */
export const formatDate = (date: string | Date, formatStr: string = 'PP'): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      console.warn('Invalid date:', date);
      return '';
    }
    return format(dateObj, formatStr, { locale: getDateLocale() });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Format a date to time string (HH:mm format)
 */
export const formatTime = (date: string | Date, options?: { hour12?: boolean }): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      return '';
    }
    const hour12 = options?.hour12 ?? false;
    return format(dateObj, hour12 ? 'p' : 'HH:mm', { locale: getDateLocale() });
  } catch (error) {
    console.error('Error formatting time:', error);
    return '';
  }
};

/**
 * Format a date to date and time string
 */
export const formatDateTime = (date: string | Date, options?: { hour12?: boolean }): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      return '';
    }
    const hour12 = options?.hour12 ?? false;
    return format(dateObj, hour12 ? 'PPp' : 'PP HH:mm', { locale: getDateLocale() });
  } catch (error) {
    console.error('Error formatting dateTime:', error);
    return '';
  }
};

/**
 * Format date for chart display based on time range
 */
export const formatChartDate = (date: Date | string, timeRange: '1day' | '1week' | '1month' | '2months' | '3months'): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      return '';
    }

    const locale = getDateLocale();

    if (timeRange === '1day') {
      return format(dateObj, 'HH:mm', { locale });
    } else if (timeRange === '1week') {
      return format(dateObj, 'EEE HH:mm', { locale });
    } else {
      return format(dateObj, 'MMM d', { locale });
    }
  } catch (error) {
    console.error('Error formatting chart date:', error);
    return '';
  }
};

/**
 * Format date range label
 */
export const formatDateRange = (
  startDate: Date | string,
  endDate: Date | string,
  timeRange: '1day' | '1week' | '1month' | '2months' | '3months',
  hourOffset?: number
): string => {
  try {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

    if (!isValid(start) || !isValid(end)) {
      return '';
    }

    const locale = getDateLocale();

    if (timeRange === '1day') {
      if (hourOffset === 0) {
        return i18n.t('common.today', { defaultValue: 'Today' });
      } else if (hourOffset === -1) {
        return i18n.t('common.yesterday', { defaultValue: 'Yesterday' });
      } else {
        return format(start, 'MMM d, yyyy', { locale });
      }
    } else {
      const startStr = format(start, 'MMM d', { locale });
      const endStr = format(new Date(end.getTime() - 1), 'MMM d, yyyy', { locale });
      return `${startStr} - ${endStr}`;
    }
  } catch (error) {
    console.error('Error formatting date range:', error);
    return '';
  }
};

/**
 * Get relative time (e.g., "2 hours ago", "in 3 days")
 */
export const formatRelativeTime = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      return '';
    }
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: getDateLocale() });
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return '';
  }
};

/**
 * Format full date with weekday
 */
export const formatFullDate = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      return '';
    }
    return format(dateObj, 'EEEE, MMMM d, yyyy', { locale: getDateLocale() });
  } catch (error) {
    console.error('Error formatting full date:', error);
    return '';
  }
};

/**
 * Format date for display in lists/cards
 */
export const formatListDate = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      return '';
    }
    return format(dateObj, 'PPp', { locale: getDateLocale() });
  } catch (error) {
    console.error('Error formatting list date:', error);
    return '';
  }
};

/**
 * Parse ISO date string to Date object with proper timezone handling
 */
export const parseDate = (dateString: string): Date | null => {
  try {
    if (!dateString) return null;
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
};

/**
 * Check if date is today
 */
export const isToday = (date: string | Date): boolean => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return false;
    
    const today = new Date();
    return format(dateObj, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
  } catch (error) {
    return false;
  }
};

/**
 * Check if date is yesterday
 */
export const isYesterday = (date: string | Date): boolean => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return false;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return format(dateObj, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd');
  } catch (error) {
    return false;
  }
};

/**
 * Format date for XAxis in charts
 */
export const formatChartXAxis = (
  timestamp: number,
  timeRange: '1day' | '1week' | '1month' | '2months' | '3months'
): string => {
  try {
    const date = new Date(timestamp);
    if (!isValid(date)) return '';
    
    const locale = getDateLocale();
    
    if (timeRange === '1day') {
      return format(date, 'HH:mm', { locale });
    } else if (timeRange === '1week') {
      return format(date, 'EEE HH:mm', { locale });
    } else {
      return format(date, 'MMM d', { locale });
    }
  } catch (error) {
    console.error('Error formatting chart XAxis:', error);
    return '';
  }
};

/**
 * Get current local datetime in format suitable for datetime-local input
 * This preserves the user's local timezone
 */
export const getCurrentLocalDateTime = (): string => {
  const now = new Date();
  // Get local date/time components
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  // Return in format: YYYY-MM-DDTHH:mm (local time, no timezone)
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Convert datetime-local value to ISO string
 * datetime-local inputs provide local time without timezone info
 * This function converts it to ISO format preserving the local time
 */
export const localDateTimeToISO = (localDateTime: string): string => {
  if (!localDateTime) return '';
  
  try {
    // datetime-local format: YYYY-MM-DDTHH:mm
    // Create a date object from the local datetime string
    // The Date constructor interprets this as local time
    const date = new Date(localDateTime);
    
    if (!isValid(date)) {
      console.warn('Invalid datetime string:', localDateTime);
      return '';
    }
    
    // Return ISO string - this will include timezone offset
    return date.toISOString();
  } catch (error) {
    console.error('Error converting local datetime to ISO:', error);
    return '';
  }
};

/**
 * Get current local date in format suitable for date input (YYYY-MM-DD)
 * This preserves the user's local date
 */
export const getCurrentLocalDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

