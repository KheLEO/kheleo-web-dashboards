export const formatNumber = (value: number): string =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
export const formatMoney = (value: number | string, currency = "INR"): string =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(Number(value));
export const formatDate = (value: string): string =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(
    new Date(value),
  );
