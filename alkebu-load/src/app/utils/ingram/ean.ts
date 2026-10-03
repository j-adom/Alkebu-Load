// ISBN normalization: Ingram keys every record on the 13-digit EAN, while our editions
// hold a mix of ISBN-13s, ISBN-10s, hyphenated forms and the odd non-ISBN value.

function ean13CheckDigit(first12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i += 1) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

function isValidIsbn10(isbn: string): boolean {
  let sum = 0;
  for (let i = 0; i < 10; i += 1) {
    const ch = isbn[i];
    const value = ch === 'X' ? (i === 9 ? 10 : NaN) : Number(ch);
    if (Number.isNaN(value)) return false;
    sum += value * (10 - i);
  }
  return sum % 11 === 0;
}

/** A checksum-valid EAN-13 for an ISBN-13 or ISBN-10, else null. */
export function toEan13(value: string | null | undefined): string | null {
  const s = String(value ?? '').toUpperCase().replace(/[\s-]/g, '');
  if (/^\d{13}$/.test(s)) return ean13CheckDigit(s.slice(0, 12)) === Number(s[12]) ? s : null;
  if (/^\d{9}[\dX]$/.test(s) && isValidIsbn10(s)) {
    const first12 = `978${s.slice(0, 9)}`;
    return `${first12}${ean13CheckDigit(first12)}`;
  }
  return null;
}
