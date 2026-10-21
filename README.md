# Cash Khata

Khata Book jaisi cash inward / outward app. Frontend GitHub Pages par, data Google Sheet me (Apps Script Web App ke through).

## Files
| File | Kaam |
|---|---|
| `index.html` | Poori app (UI + logic) |
| `config.js` | Apps Script URL yahan daalo |
| `apps-script/Code.gs` | Google Sheet backend — Apps Script me paste karna hai, GitHub pe chalne wala nahi |
| `.nojekyll` | GitHub Pages ke liye |

## Step 1 — Google Sheet backend
1. Sheet kholo → **Extensions → Apps Script**
2. `apps-script/Code.gs` ka poora code paste karo
3. `APP_PIN` badlo — 4-digit mat rakho, kam se kam 6–8 characters
4. Editor me `testSetup` function run karo → permission allow karo → "Transactions" tab ban jayega
5. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. `/exec` se khatam hone wala URL copy karo

> Code me baad me koi change kiya to **Manage deployments → Edit → New version** karna padega.

## Step 2 — GitHub Pages
1. `config.js` me `API_URL` me woh `/exec` URL paste karo (ya baad me app ke ⚙ Settings me daal sakte ho)
2. GitHub pe nayi repo banao, saari files upload karo (`apps-script` folder optional hai)
3. **Settings → Pages → Source: Deploy from a branch → main / (root)** → Save
4. 1–2 minute me `https://<username>.github.io/<repo>/` pe app live

PIN app me pehli baar khulne pe poochha jayega (repo me save nahi hota).

## Sheet structure
App tumhari existing **"Cash Flow"** tab hi use karta hai: `Date | Name | Cash In | Cash Out`.
Pehli baar chalne par script right side me **Mode | Note | ID** columns jodta hai aur purani rows me ID bhar deta hai.

- Columns naam se dhoondhe jaate hain, order badlo to bhi chalega — bas header ke naam same rakhna
- **ID column ko edit/delete mat karna** — app usi se row pehchanta hai
- Sheet me seedha nayi row likh sakte ho; agli Refresh pe app use utha lega (ID khud bhar jayegi)
- Date cell agar real date hai to koi dikkat nahi. Agar text hai to `TEXT_DATE_FORMAT` (Code.gs) se padhi jaati hai
- Ek hi row me Cash In aur Cash Out dono bhare ho to app me woh do entries dikhengi, par unhe edit Sheet me hi karna hoga

## Balance logic
- Home summary: **Net = Cash In − Cash Out** (selected period ke liye)
- Person balance: **Out − In**. Positive = "Lena hai" (aapne zyada diya), negative = "Dena hai" (aapne zyada liya)
- Party list ka balance hamesha all-time hota hai; period filter sirf summary aur "All Entries" tab pe lagta hai

## Limitations
- Apps Script URL public hai — security sirf PIN pe hai. Strong PIN rakho.
- Har request ~1–3 sec leti hai (Apps Script cold start). Offline kaam nahi karta.
- Ek hi tab; kuch hazaar rows tak theek chalega, bahut badi sheet pe har refresh slow hoga.
- `config.js` me `BALANCE_STYLE: "cashflow"` karo to "Lena/Dena" ki jagah "Net diya / Net mila" dikhega.
