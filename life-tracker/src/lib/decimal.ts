const SCALE = 4;
const ZERO = BigInt(0);
const FACTOR = BigInt(10) ** BigInt(SCALE);
const DECIMAL_PATTERN = /^(-?)(\d{1,14})(?:\.(\d{1,4}))?$/;

export function parseDecimal(value: string): bigint {
  const match = DECIMAL_PATTERN.exec(value.trim());
  if (!match) {
    throw new Error("Enter a number.");
  }
  const sign = match[1] === "-" ? -BigInt(1) : BigInt(1);
  const whole = BigInt(match[2] ?? "0");
  const fraction = (match[3] ?? "").padEnd(SCALE, "0");
  return sign * (whole * FACTOR + BigInt(fraction));
}

export function formatDecimal(scaled: bigint): string {
  const negative = scaled < ZERO;
  const absolute = negative ? -scaled : scaled;
  const whole = absolute / FACTOR;
  const fraction = (absolute % FACTOR).toString().padStart(SCALE, "0");
  return `${negative ? "-" : ""}${whole.toString()}.${fraction}`;
}

export function decimalString(value: string): string {
  return formatDecimal(parseDecimal(value));
}

export function displayDecimal(value: string): string {
  const [whole, fraction] = decimalString(value).split(".");
  const trimmed = (fraction ?? "").replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole ?? "0";
}

export function addDecimals(left: string, right: string): string {
  return formatDecimal(parseDecimal(left) + parseDecimal(right));
}

export function subtractDecimals(left: string, right: string): string {
  return formatDecimal(parseDecimal(left) - parseDecimal(right));
}

export function sumDecimals(values: string[]): string {
  return formatDecimal(values.reduce((total, value) => total + parseDecimal(value), ZERO));
}

export function compareDecimals(left: string, right: string): -1 | 0 | 1 {
  const delta = parseDecimal(left) - parseDecimal(right);
  if (delta < ZERO) {
    return -1;
  }
  if (delta > ZERO) {
    return 1;
  }
  return 0;
}

export function percentRatio(numerator: string, denominator: string): { text: string; bar: number } | null {
  const den = parseDecimal(denominator);
  if (den === ZERO) {
    return null;
  }
  const num = parseDecimal(numerator);
  const negative = (num < ZERO) !== (den < ZERO);
  const absoluteNumerator = num < ZERO ? -num : num;
  const absoluteDenominator = den < ZERO ? -den : den;
  const hundredths = (absoluteNumerator * BigInt(10000) + absoluteDenominator / BigInt(2)) / absoluteDenominator;
  const whole = hundredths / BigInt(100);
  const fraction = hundredths % BigInt(100);
  let text = `${negative ? "-" : ""}${whole.toString()}`;
  if (fraction !== ZERO) {
    text += `.${fraction.toString().padStart(2, "0").replace(/0+$/, "")}`;
  }
  const bar = negative || hundredths <= ZERO ? 0 : hundredths >= BigInt(10000) ? 100 : Number(hundredths) / 100;
  return { text, bar };
}
