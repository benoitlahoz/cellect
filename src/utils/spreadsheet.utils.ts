export const numberToSpreadsheetColumn = (n: number): string => {
  const res = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[n % 26];
  return n >= 26
    ? numberToSpreadsheetColumn(Math.floor(n / 26) - 1) + res
    : res;
};
