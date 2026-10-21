// App configuration
// API_URL: the Apps Script Web App URL (ends in "/exec").
//          Leave it blank to run the app in demo mode (sample data, nothing is saved).
window.KHATA_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbyOMGj-E-UbxK9ftjC6LAO5K0E9IjFHwKZhGYCL1d45JRI6-pZugd4P2sMc6RJIHDrU/exec",
  APP_NAME: "Balance",
  CURRENCY: "TSH",
  // "khata"    → party balances shown as "To Receive" / "To Pay"
  // "cashflow" → party balances shown as "Net Paid" / "Net Received" (no credit tracking)
  BALANCE_STYLE: "khata",
  // First month of the financial year (1 = January … 12 = December).
  // Used by the "Current financial year" filter. 4 = April–March, 7 = July–June, 1 = January–December.
  FY_START_MONTH: 4
};
