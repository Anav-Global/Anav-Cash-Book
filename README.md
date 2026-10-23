# Balance — Cash Book

A simple cash book web app for recording cash in and cash out, with a separate ledger for every party.
The app runs in the browser (and can be installed on a phone or computer), and all data is stored in a Google Sheet.

## Features
- Record **Cash In** and **Cash Out** entries with date, payment mode and note
- **Receivables & Payables statement:** Receivables on the left, Payables on the right, each with a total, and the net position below
- **Party ledger** with date-wise entries and running balance; export to CSV, print / save as PDF, or share a summary
- **Multi-currency:** TSH, Rupees (INR) and Dollar (USD). Each party has a separate account per currency, and the dashboard is shown one currency at a time — amounts in different currencies are never added together
- **Opening balance** per party and currency
- Summary of Cash In, Cash Out and Net for: all time, today, this month, last month, current financial year, or a **custom date range**
- Edit, delete and rename — every change is written to the Google Sheet immediately
- **Installable app** (Android, iPhone, Windows, Mac) via the **⬇ App** button
- PIN-protected access

## Files
| File | Purpose |
|---|---|
| `index.html` | The app |
| `config.js` | Settings: Apps Script URL, app name, currencies, balance labels, financial year |
| `manifest.json`, `sw.js`, `icons/` | Make the app installable — keep them in the root folder |
| `apps-script/Code.gs` | Google Sheet backend — paste into Apps Script (not run from the website) |

## 1. Set up the Google Sheet backend
1. Open the Google Sheet → **Extensions → Apps Script**.
2. Replace the contents of `Code.gs` with `apps-script/Code.gs` from this package.
3. Change `APP_PIN` to a PIN of at least 8 characters. **Change it only in the Apps Script editor — never commit the real PIN to GitHub.**
4. Select `testSetup` in the function drop-down and click **Run**. Grant the requested permissions (choose *Advanced → Go to project* if Google shows an "unverified app" warning — this is expected for your own script).
5. **Deploy → New deployment → Web app**, with *Execute as: Me* and *Who has access: Anyone*.
6. Copy the Web App URL (it ends in `/exec`).

**Updating the script later:** Deploy → Manage deployments → Edit (pencil) → Version: **New version** → Deploy. This keeps the same URL.

## 2. Configure and publish the website
1. In `config.js`, set `API_URL` to the Web App URL. Adjust `APP_NAME`, `CURRENCIES`, `DEFAULT_CURRENCY`, `BALANCE_STYLE` and `FY_START_MONTH` if required.
2. Upload all files (including the `icons` and `apps-script` folders) to the root of the GitHub repository.
3. Hosting:
   - **Vercel:** import the repository, Application Preset **Other**, Root Directory `./`, no build settings. Each commit redeploys automatically.
   - **GitHub Pages:** Settings → Pages → Deploy from a branch → `main` / root.
4. Open the site and press **Ctrl + Shift + R** once to load the latest version.

## Google Sheet layout
The app uses the **Cash Flow** tab with the columns `Date | Name | Cash In | Cash Out`.
On first use, the script adds **Mode | Note | ID | Currency** to the right and fills an ID for every existing row.

- Columns are found by their header name, so their order can be changed — keep the header names the same.
- **Do not edit or delete the ID column.** The app uses it to identify rows.
- Rows can also be added directly in the Sheet; they appear in the app after pressing **⟳ Refresh**.
- If a row has both Cash In and Cash Out filled, the app shows it as two entries; such rows must be edited in the Sheet.

## Balances
- **Home summary:** Net = Cash In − Cash Out for the selected period.
- **Party balance:** Cash Out − Cash In (plus opening balance).
  Positive = **Receivable** (you paid them more than you received) — shown in green; negative = **Payable** — shown in red.
- **Parties tab — Receivables & Payables statement (Tally style), as at today:**
  - **Left:** Receivables — each party whose balance is in your favour, with total (green).
  - **Right:** Payables — each party you owe, with total (red).
  - **Bottom:** Net receivable / net payable = Total receivables − Total payables.
  - Amounts are shown to 2 decimals. Parties with a nil balance are listed below as "Settled parties".
  - Tap a party name to open its ledger. Typing in Search switches to a simple filtered list.
  - Set `COMPANY_NAME` in `config.js` to show the company name in the header.
- Party balances are always all-time (as at today); the period filter, including the custom range, applies to the summary and the *All Entries* tab.
- Amounts use international grouping (115,000). Set `NUMBER_LOCALE: "en-IN"` in `config.js` for Indian grouping (1,15,000).

## Opening balance
- In a party's ledger, use **⊕ Opening balance**, or use **"Add an opening balance instead"** in the new-entry form.
- It is saved as a normal row with **Mode = Opening** ("Receivable" → Cash Out column, "Payable" → Cash In column).
- It is included in the party's balance and shown at the top of the ledger, but is **excluded from the Cash In / Cash Out totals** in the app.
- If you total the Sheet columns yourself, exclude opening rows, for example: `=SUMIFS(C:C, E:E, "<>Opening")` (C = Cash In; use D for Cash Out; E = Mode).

## Using the app on a phone
- **Back button** (Android) closes an open form first, then returns from a ledger to the home screen — it does not exit the app.
- **Pull down** on the home screen or a ledger to refresh from the Google Sheet. Data also refreshes automatically when the app is reopened after 30 seconds or more.
- Ledgers are shown as cards on phones (newest first) and as a table on larger screens and in print.
- Ledger actions (CSV, Print / PDF, Share summary, Opening balance, Rename) scroll sideways.

## Currencies
- Choose the currency in the **Currency** row of the entry form (TSH / ₹ Rupees / $ Dollar). New entries default to the currency currently selected on the dashboard.
- The **currency bar** at the top of the home screen switches the whole dashboard — summary, Receivables & Payables, All Entries — to one currency. Each button shows how many entries exist in that currency.
- **Each party has one account per currency.** In a party's ledger, the three account tiles show the balance in each currency (or "No entries"); tap one to open that account and add entries to it.
- Totals are never added across currencies. There is no exchange-rate conversion.
- The Google Sheet stores the currency in a **Currency** column (added automatically). Rows with a blank Currency are treated as `DEFAULT_CURRENCY` (TSH).
- If you total columns in the Sheet yourself, total per currency, e.g. `=SUMIFS(C:C, H:H, "USD", E:E, "<>Opening")` (C = Cash In, H = Currency, E = Mode).
- **The updated `Code.gs` must be deployed** (as a New version) before non-default currencies can be saved. Until then the app refuses to save INR/USD entries, so they are never saved under the wrong currency.
- The Apps Script URL in `config.js` always takes priority. A URL typed in ⚙ Settings is only used when `config.js` has none, and an old URL saved on a device is cleared automatically.
- **Check:** ⚙ Settings → **Test** (it also shows the end of the URL in use, to compare with Deploy → Manage deployments). "Apps Script is up to date" means currencies will save; "running the OLD Apps Script" means the web app URL in `config.js` is still serving the old version.
- Saving the code or running `testSetup` in the editor is **not** enough — the web app only changes after Deploy → Manage deployments → ✎ Edit → Version: **New version** → Deploy. "New deployment" creates a different URL, which would then need to be put in `config.js`.

## Installing the app
- **Android / Windows / Mac (Chrome or Edge):** tap **⬇ App** → Install.
- **iPhone / iPad:** open the site in **Safari**, tap **⬇ App** and follow the steps (Share → Add to Home Screen).
- The installed app still needs an internet connection to read and save data.

## Limitations
- The Apps Script URL is public; access is protected only by the PIN. Use a strong PIN.
- Each request takes about 1–3 seconds (Apps Script start-up time). The app does not work offline.
- Designed for a single tab with up to a few thousand rows; very large sheets will make each refresh slower.
