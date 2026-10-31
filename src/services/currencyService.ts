export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  country: string;
  locale: string;
  flag: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', country: 'India', locale: 'en-IN', flag: '🇮🇳', decimals: 2 },
  { code: 'USD', symbol: '$', name: 'US Dollar', country: 'United States', locale: 'en-US', flag: '🇺🇸', decimals: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', country: 'European Union', locale: 'en-IE', flag: '🇪🇺', decimals: 2 },
  { code: 'GBP', symbol: '£', name: 'British Pound', country: 'United Kingdom', locale: 'en-GB', flag: '🇬🇧', decimals: 2 },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', country: 'United Arab Emirates', locale: 'ar-AE', flag: '🇦🇪', decimals: 2 },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', country: 'Saudi Arabia', locale: 'ar-SA', flag: '🇸🇦', decimals: 2 },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', country: 'Canada', locale: 'en-CA', flag: '🇨🇦', decimals: 2 },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar', country: 'Australia', locale: 'en-AU', flag: '🇦🇺', decimals: 2 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', country: 'Japan', locale: 'ja-JP', flag: '🇯🇵', decimals: 0 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', country: 'Singapore', locale: 'en-SG', flag: '🇸🇬', decimals: 2 },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', country: 'Switzerland', locale: 'de-CH', flag: '🇨🇭', decimals: 2 },
  { code: 'CNY', symbol: 'CN¥', name: 'Chinese Yuan', country: 'China', locale: 'zh-CN', flag: '🇨🇳', decimals: 2 },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', country: 'Pakistan', locale: 'ur-PK', flag: '🇵🇰', decimals: 2 },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', country: 'Bangladesh', locale: 'bn-BD', flag: '🇧🇩', decimals: 2 },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', country: 'Sri Lanka', locale: 'si-LK', flag: '🇱🇰', decimals: 2 },
  { code: 'NPR', symbol: 'रू', name: 'Nepalese Rupee', country: 'Nepal', locale: 'ne-NP', flag: '🇳🇵', decimals: 2 },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', country: 'Brazil', locale: 'pt-BR', flag: '🇧🇷', decimals: 2 },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', country: 'South Africa', locale: 'en-ZA', flag: '🇿🇦', decimals: 2 },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', country: 'Malaysia', locale: 'ms-MY', flag: '🇲🇾', decimals: 2 },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', country: 'Indonesia', locale: 'id-ID', flag: '🇮🇩', decimals: 0 },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', country: 'Thailand', locale: 'th-TH', flag: '🇹🇭', decimals: 2 },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', country: 'Philippines', locale: 'en-PH', flag: '🇵🇭', decimals: 2 },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', country: 'South Korea', locale: 'ko-KR', flag: '🇰🇷', decimals: 0 },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', country: 'Russia', locale: 'ru-RU', flag: '🇷🇺', decimals: 2 },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', country: 'Turkey', locale: 'tr-TR', flag: '🇹🇷', decimals: 2 },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', country: 'Nigeria', locale: 'en-NG', flag: '🇳🇬', decimals: 2 },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', country: 'Kenya', locale: 'en-KE', flag: '🇰🇪', decimals: 2 },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', country: 'New Zealand', locale: 'en-NZ', flag: '🇳🇿', decimals: 2 },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', country: 'Mexico', locale: 'es-MX', flag: '🇲🇽', decimals: 2 },
];

export const DEFAULT_CURRENCY_CODE = 'INR';

export function getCurrencyInfo(code?: string): CurrencyInfo {
  const targetCode = (code || DEFAULT_CURRENCY_CODE).toUpperCase();
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === targetCode);
  return (
    found || {
      code: targetCode,
      symbol: targetCode === 'INR' ? '₹' : '$',
      name: targetCode,
      country: '',
      locale: targetCode === 'INR' ? 'en-IN' : 'en-US',
      flag: '🌐',
      decimals: 2,
    }
  );
}

export function getCurrencySymbol(code?: string): string {
  return getCurrencyInfo(code).symbol;
}

export function formatMoney(
  amount: number,
  currencyCode: string = DEFAULT_CURRENCY_CODE,
  options: {
    showSign?: boolean;
    decimals?: number;
    compact?: boolean;
  } = {}
): string {
  const info = getCurrencyInfo(currencyCode);
  const num = Number(amount) || 0;
  const isNegative = num < 0;
  const absVal = Math.abs(num);
  const dec = options.decimals !== undefined ? options.decimals : info.decimals;

  try {
    const formattedNum = new Intl.NumberFormat(info.locale, {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
      notation: options.compact ? 'compact' : 'standard',
    }).format(absVal);

    const sign = options.showSign && num > 0 ? '+' : isNegative ? '-' : '';
    return `${sign}${info.symbol}${formattedNum}`;
  } catch {
    const sign = options.showSign && num > 0 ? '+' : isNegative ? '-' : '';
    return `${sign}${info.symbol}${absVal.toFixed(dec)}`;
  }
}
