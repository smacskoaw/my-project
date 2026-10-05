import { normalizeDigits } from './validation';
export function normalizeSearch(value: string) {
  const normalized = normalizeDigits(value).trim().toLocaleLowerCase('ar').replace(/\s+/g, ' ');
  return /^[+\d\s()-]+$/.test(normalized)
    ? normalized.replace(/[^\d]/g, '').replace(/^00?/, '')
    : normalized;
}
export function searchTokens(fullName: string, phone: string) {
  const tokens = new Set<string>();
  const name = normalizeSearch(fullName);
  // Indexed prefix search for the full name and each individual word.
  for (const part of [name, ...name.split(' ')])
    for (let end = 1; end <= part.length; end++) tokens.add(part.slice(0, end));
  const digits = phone.replace(/\D/g, '');
  // Phone search also supports local format and any contiguous part of the number.
  for (let start = 0; start < digits.length; start++)
    for (let end = start + 1; end <= digits.length; end++) tokens.add(digits.slice(start, end));
  return [...tokens];
}
