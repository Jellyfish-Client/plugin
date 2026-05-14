// Temporal helpers shared across modules.
//
// formatUpcomingDate(iso) → short localized "day month" string (e.g. "14 mai")
// Returns '' when input is missing, not a string, or an invalid date.
let cachedFormatter = null;
let cachedLocale = null;

function getFormatter() {
  const locale = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'fr-FR';
  if (cachedFormatter && cachedLocale === locale) return cachedFormatter;
  try {
    cachedFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
    cachedLocale = locale;
  } catch (_) {
    // Locale rejected — fall back to fr-FR which is the project default.
    cachedFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
    cachedLocale = 'fr-FR';
  }
  return cachedFormatter;
}

export function formatUpcomingDate(iso) {
  if (!iso || typeof iso !== 'string') return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  try {
    return getFormatter().format(new Date(t));
  } catch (_) {
    return '';
  }
}
