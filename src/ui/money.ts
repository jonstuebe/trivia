/** Dollars as shown on every screen: "$32,000". */
export function formatMoney(dollars: number): string {
  return `$${dollars.toLocaleString("en-US")}`;
}
