export function safeFormatDate(
  dateVal: any,
  locale: string = 'en-IN',
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateVal) return '-';

  // Helper to convert Gujarati digits to standard Latin digits
  const toLatinDigits = (s: string): string => {
    const guDigits = [/૦/g, /૧/g, /૨/g, /૩/g, /૪/g, /૫/g, /૬/g, /૭/g, /૮/g, /૯/g];
    let res = s;
    for (let i = 0; i < 10; i++) {
      res = res.replace(guDigits[i], String(i));
    }
    return res;
  };

  try {
    // If it's already a Date object
    if (dateVal instanceof Date) {
      if (isNaN(dateVal.getTime())) return '-';
      try {
        return toLatinDigits(dateVal.toLocaleDateString(locale, options));
      } catch (e) {
        // Fallback if toLocaleDateString fails
        const d = String(dateVal.getDate()).padStart(2, '0');
        const m = String(dateVal.getMonth() + 1).padStart(2, '0');
        const y = String(dateVal.getFullYear());
        return `${d}/${m}/${y}`;
      }
    }

    const str = String(dateVal).trim();
    if (!str || str === 'undefined' || str === 'null') return '-';

    // 1. Handle YYYY-MM-DD format (like "2026-07-05") directly to avoid timezone offset shifts!
    const ymdRegex = /^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/;
    const ymdMatch = str.match(ymdRegex);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, '0');
      const day = ymdMatch[3].padStart(2, '0');
      
      if (options) {
        try {
          const parsed = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
          return toLatinDigits(parsed.toLocaleDateString(locale, options));
        } catch (e) {
          return `${day}/${month}/${year}`;
        }
      }
      return `${day}/${month}/${year}`;
    }

    // 2. Handle DD/MM/YYYY or DD-MM-YYYY format directly
    const dmyRegex = /^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/;
    const dmyMatch = str.match(dmyRegex);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];

      if (options) {
        try {
          const parsed = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
          return toLatinDigits(parsed.toLocaleDateString(locale, options));
        } catch (e) {
          return `${day}/${month}/${year}`;
        }
      }
      return `${day}/${month}/${year}`;
    }

    // 3. Try standard parsing for other formats (like ISO strings: "2026-07-01T14:30:00.000Z")
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      if (!options) {
        const day = String(parsed.getDate()).padStart(2, '0');
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const year = String(parsed.getFullYear());
        return `${day}/${month}/${year}`;
      }
      try {
        return toLatinDigits(parsed.toLocaleDateString(locale, options));
      } catch (e) {
        const day = String(parsed.getDate()).padStart(2, '0');
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const year = String(parsed.getFullYear());
        return `${day}/${month}/${year}`;
      }
    }

    return toLatinDigits(str);
  } catch (err) {
    console.error('Error formatting date:', err);
    return '-';
  }
}


