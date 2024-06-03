/**
 * Create a debug utility with given prefix.
 *
 * @param { string } prefix The prefix to log before debug strings (optional).
 *
 * @returns { Function } A function to use for debug.
 */
export const useDebug = (prefix?: string) =>
  console.warn.bind(console, `${prefix ? `${prefix}: ` : ''}%s`);
