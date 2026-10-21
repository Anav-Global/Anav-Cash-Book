/**
 * Cash Khata — Google Sheets backend (Apps Script Web App)
 * Tumhari existing "Cash Flow" sheet ke saath kaam karta hai:
 *   Date | Name | Cash In | Cash Out   (yeh columns waise hi rahenge)
 * Script right side me 3 naye columns jodega: Mode | Note | ID
 * (ID se app edit/delete karta hai — ID column ko delete ya edit mat karna.)
 *
 * SETUP:
 * 1. Google Sheet → Extensions → Apps Script → yeh code Code.gs me paste karo
 * 2. APP_PIN badlo (8+ characters)
 * 3. Upar function dropdown se "testSetup" chuno → Run → permission allow karo
 * 4. Deploy → New deployment → Web app
 *      Execute as: Me      Who has access: Anyone
 * 5. "/exec" wala URL config.js me ya app ke ⚙ Settings me daalo
 *
 * Code badlo to: Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy
 */

const SPREADSHEET_ID = '1_MO-WUtcTXKbeSqi5ZQZcgIUnxZoqc0JICi9PnlcTqE';
const SHEET_NAME = 'Cash Flow';          // tab ka naam; na mile to pehli tab use hogi
const APP_PIN = 'CHANGE_ME_123456';      // <-- ZAROOR BADLO
const TEXT_DATE_FORMAT = 'DD/MM/YYYY';   // sirf tab use hota hai jab date cell me TEXT ho; 'MM/DD/YYYY' bhi chalega

// Header names (case/space ignore). Column order kuch bhi ho, naam se dhoondha jata hai.
const COLS = {
  date:   ['date', 'tarikh'],
  person: ['name', 'person', 'party'],
  in:     ['cash in', 'cash inward', 'inward', 'in'],
  out:    ['cash out', 'cash outward', 'outward', 'out'],
  mode:   ['mode', 'payment mode'],
  note:   ['note', 'notes', 'remark', 'remarks', 'narration'],
  id:     ['id']
};
const NEW_HEADERS = { mode: 'Mode', note: 'Note', id: 'ID' };

/* ---------------- web app entry ---------------- */
function doGet(e) { return respond(route((e && e.parameter) || {})); }

function doPost(e) {
  let p;
  try { p = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return respond({ ok: false, error: 'Bad request' }); }
  return respond(route(p));
}

function route(p) {
  if (!p.pin || String(p.pin) !== APP_PIN) {
    Utilities.sleep(800);
    return { ok: false, error: 'Galat PIN' };
  }
  try {
    switch (p.action) {
      case 'ping':   return { ok: true, data: 'pong' };
      case 'list':   return withLock(function () { return { ok: true, data: listEntries() }; });
      case 'add':    return withLock(function () { return { ok: true, data: addEntry(p.entry) }; });
      case 'update': return withLock(function () { return { ok: true, data: updateEntry(p.entry) }; });
      case 'delete': return withLock(function () { return { ok: true, data: deleteEntry(p.id) }; });
      case 'rename': return withLock(function () { return { ok: true, data: renamePerson(p.from, p.to) }; });
      default:       return { ok: false, error: 'Unknown action' };
    }
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function withLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ---------------- sheet helpers ---------------- */
function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return (SHEET_NAME && ss.getSheetByName(SHEET_NAME)) || ss.getSheets()[0];
}

// Header row padh ke column numbers nikalta hai; Mode/Note/ID na ho to jod deta hai.
function getMap(sh) {
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, 4).setValues([['Date', 'Name', 'Cash In', 'Cash Out']]).setFontWeight('bold');
  }
  const lastCol = Math.max(sh.getLastColumn(), 1);
  const hdr = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h).replace(/\s+/g, ' ').trim().toLowerCase();
  });
  const map = {};
  Object.keys(COLS).forEach(function (k) {
    for (let a = 0; a < COLS[k].length; a++) {
      const i = hdr.indexOf(COLS[k][a]);
      if (i > -1) { map[k] = i + 1; break; }
    }
  });
  ['date', 'person', 'in', 'out'].forEach(function (k) {
    if (!map[k]) throw new Error('Sheet ki pehli row me "' + COLS[k][0] + '" column nahi mila');
  });
  let next = lastCol;
  ['mode', 'note', 'id'].forEach(function (k) {
    if (!map[k]) {
      next++;
      sh.getRange(1, next).setValue(NEW_HEADERS[k]).setFontWeight('bold');
      map[k] = next;
    }
  });
  map.width = Math.max(next, map.date, map.person, map.in, map.out, map.mode, map.note, map.id);
  return map;
}

function readRows(sh, map) {
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, map.width).getValues();
}

function pad(n) { n = String(n); return n.length < 2 ? '0' + n : n; }

function num(v) {
  if (typeof v === 'number') return v;
  const x = parseFloat(String(v == null ? '' : v).replace(/[,₹\s]/g, ''));
  return isNaN(x) ? 0 : x;
}

function isDate(v) { return Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime()); }

function parseDate(v, tz) {
  if (isDate(v)) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  const s = String(v == null ? '' : v).trim();
  if (!s) return '';
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + '-' + pad(m[2]) + '-' + pad(m[3]);
  m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (m) {
    const a = +m[1], b = +m[2];
    let y = +m[3]; if (y < 100) y += 2000;
    const us = TEXT_DATE_FORMAT === 'MM/DD/YYYY';
    return y + '-' + pad(us ? a : b) + '-' + pad(us ? b : a);
  }
  return '';
}

// Noon pe date banate hain taaki timezone ki wajah se din na khiske
function toDate(iso) {
  const p = iso.split('-');
  return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0);
}

function safeText(s, max) {
  s = String(s == null ? '' : s).trim().slice(0, max || 120);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function unsafeText(s) {
  s = String(s == null ? '' : s);
  return s.charAt(0) === "'" ? s.slice(1) : s;
}

function clean(e) {
  if (!e) throw new Error('Entry missing');
  const person = String(e.person || '').trim();
  const type = String(e.type || '').toUpperCase();
  const amount = Math.round(Number(e.amount) * 100) / 100;
  const date = String(e.date || '').trim();
  if (!person) throw new Error('Person ka naam zaroori hai');
  if (type !== 'IN' && type !== 'OUT') throw new Error('Type IN ya OUT hona chahiye');
  if (!(amount > 0)) throw new Error('Amount 0 se zyada hona chahiye');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Date galat format me hai');
  return { person: person.slice(0, 120), type: type, amount: amount, date: date,
           mode: String(e.mode || 'Cash').slice(0, 30), note: String(e.note || '').slice(0, 500) };
}

// id format: "<rowId>" ya "<rowId>|IN" / "<rowId>|OUT" (jab ek hi row me In aur Out dono bhare ho)
function splitId(id) {
  const s = String(id || '');
  const i = s.lastIndexOf('|');
  return i > -1 ? { row: s.slice(0, i), part: s.slice(i + 1) } : { row: s, part: '' };
}

function findRow(sh, map, rowId) {
  const n = sh.getLastRow() - 1;
  if (n < 1 || !rowId) return -1;
  const ids = sh.getRange(2, map.id, n, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]).trim() === rowId) return i + 2;
  return -1;
}

/* ---------------- actions ---------------- */
function listEntries() {
  const sh = getSheet();
  const map = getMap(sh);
  const tz = sh.getParent().getSpreadsheetTimeZone();
  const rows = readRows(sh, map);
  const out = [];
  let idsChanged = false;
  const idCol = rows.map(function (r) { return [r[map.id - 1]]; });

  rows.forEach(function (r, i) {
    const g = function (k) { return r[map[k] - 1]; };
    const person = unsafeText(g('person')).replace(/\s+/g, ' ').trim();
    const ain = num(g('in')), aout = num(g('out'));
    if (!person && !ain && !aout) return;            // khali row
    let id = String(g('id') || '').trim();
    if (!id) { id = Utilities.getUuid(); idCol[i][0] = id; idsChanged = true; }
    const both = ain > 0 && aout > 0;
    const base = {
      date: parseDate(g('date'), tz),
      person: person || '(Bina naam)',
      mode: String(g('mode') || ''),
      note: unsafeText(g('note')),
      createdAt: 'r' + ('000000' + (i + 2)).slice(-7)  // same-day order = sheet row order
    };
    if (ain > 0)  out.push(Object.assign({ id: both ? id + '|IN' : id,  type: 'IN',  amount: ain },  base));
    if (aout > 0) out.push(Object.assign({ id: both ? id + '|OUT' : id, type: 'OUT', amount: aout }, base));
  });

  if (idsChanged) sh.getRange(2, map.id, idCol.length, 1).setValues(idCol);
  return out;
}

function addEntry(e) {
  const c = clean(e);
  const sh = getSheet();
  const map = getMap(sh);
  const row = new Array(map.width).fill('');
  const id = Utilities.getUuid();
  row[map.date - 1] = toDate(c.date);
  row[map.person - 1] = safeText(c.person, 120);
  row[(c.type === 'IN' ? map.in : map.out) - 1] = c.amount;
  row[map.mode - 1] = c.mode;
  row[map.note - 1] = safeText(c.note, 500);
  row[map.id - 1] = id;
  const dateFmt = sh.getLastRow() >= 2 ? sh.getRange(2, map.date).getNumberFormat() : 'dd/mm/yyyy';
  sh.appendRow(row);
  const newRow = sh.getLastRow();
  sh.getRange(newRow, map.date).setNumberFormat(dateFmt && dateFmt !== '@' ? dateFmt : 'dd/mm/yyyy');
  return Object.assign({ id: id }, c);
}

function updateEntry(e) {
  const c = clean(e);
  const sh = getSheet();
  const map = getMap(sh);
  const s = splitId(e && e.id);
  const row = findRow(sh, map, s.row);
  if (row < 0) throw new Error('Entry nahi mili (shayad Sheet me delete ho gayi) — Refresh karo');
  if (s.part) throw new Error('Is row me Cash In aur Cash Out dono bhare hain — ise Sheet me hi edit karo');
  sh.getRange(row, map.date).setValue(toDate(c.date));
  sh.getRange(row, map.person).setValue(safeText(c.person, 120));
  sh.getRange(row, map.in).setValue(c.type === 'IN' ? c.amount : '');
  sh.getRange(row, map.out).setValue(c.type === 'OUT' ? c.amount : '');
  sh.getRange(row, map.mode).setValue(c.mode);
  sh.getRange(row, map.note).setValue(safeText(c.note, 500));
  return Object.assign({ id: e.id }, c);
}

function deleteEntry(id) {
  const sh = getSheet();
  const map = getMap(sh);
  const s = splitId(id);
  const row = findRow(sh, map, s.row);
  if (row < 0) throw new Error('Entry nahi mili — Refresh karo');
  if (s.part === 'IN')  { sh.getRange(row, map.in).clearContent();  return true; }
  if (s.part === 'OUT') { sh.getRange(row, map.out).clearContent(); return true; }
  sh.deleteRow(row);
  return true;
}

function renamePerson(from, to) {
  from = String(from || '').replace(/\s+/g, ' ').trim().toLowerCase();
  to = String(to || '').trim().slice(0, 120);
  if (!from || !to) throw new Error('Naam khali nahi ho sakta');
  const sh = getSheet();
  const map = getMap(sh);
  const n = sh.getLastRow() - 1;
  if (n < 1) return 0;
  const rng = sh.getRange(2, map.person, n, 1);
  const vals = rng.getValues();
  let count = 0;
  for (let i = 0; i < vals.length; i++) {
    if (unsafeText(vals[i][0]).replace(/\s+/g, ' ').trim().toLowerCase() === from) {
      vals[i][0] = safeText(to, 120); count++;
    }
  }
  if (count) rng.setValues(vals);
  return count;
}

/* Editor se ek baar Run karo: columns check + IDs fill + dates kaise padhi gayi woh Log me dikhega */
function testSetup() {
  const list = listEntries();
  Logger.log('OK — tab "' + getSheet().getName() + '", entries: ' + list.length);
  list.slice(0, 10).forEach(function (e) {
    Logger.log(e.date + ' | ' + e.person + ' | ' + e.type + ' ' + e.amount);
  });
}
