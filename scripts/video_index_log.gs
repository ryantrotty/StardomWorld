/**
 * Video index log: Google Apps Script web app bound to a Google Sheet. See docs/VIDEO_INDEX_LOG.md.
 *
 * The private app build POSTs one record per video it reads (assets/videoindex.js). This keeps one row per video
 * (the newest copy wins; first seen, last seen and times seen are kept). The export action returns every row, so the
 * data can be pulled for analysis (scripts/video_index_pull.py). Both actions need the secret key stored in the
 * script's properties (Project Settings > Script properties > KEY). No viewer details are stored.
 *
 * Request body (JSON, sent as text/plain): {"key": "...", "action": "put", "rec": {...}}
 *                                       or {"key": "...", "action": "export"}
 */
var SHEET = 'videos';
var COLS = ['id', 'first_seen', 'last_seen', 'times_seen', 'date', 'no', 'title_en', 'title_ja',
  'sides_en', 'teams_en', 'notes_en', 'sides_ja', 'teams_ja', 'notes_ja',
  'show', 'show_date', 'venue', 'set_id', 'tags', 'access', 'thumb', 'lines', 'app', 'rec'];
var JSON_COLS = { sides_en: 1, teams_en: 1, notes_en: 1, sides_ja: 1, teams_ja: 1, notes_ja: 1, tags: 1, access: 1, lines: 1, rec: 1 };
var MAX_CELL = 45000;   // a Sheets cell holds 50,000 characters

function doPost(e) {
  var body;
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return out({ ok: false, error: 'bad json' }); }
  var key = PropertiesService.getScriptProperties().getProperty('KEY');
  if (!key || body.key !== key) return out({ ok: false, error: 'bad key' });
  if (body.action === 'export') return out({ ok: true, cols: COLS, rows: exportRows() });
  if (body.action !== 'put') return out({ ok: false, error: 'bad action' });
  var rec = body.rec, why = check(rec);
  if (why) return out({ ok: false, error: why });
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return out(put(rec, String(body.app || ''))); } finally { lock.releaseLock(); }
}

function doGet() { return out({ ok: false, error: 'POST only' }); }

// Only the shape the app writes is accepted.
function check(r) {
  if (!r || typeof r !== 'object') return 'no record';
  if (typeof r.id !== 'number' || r.id < 1 || r.id > 10000000 || Math.floor(r.id) !== r.id) return 'bad id';
  var strs = ['title_en', 'title_ja', 'date', 'thumb'];
  for (var i = 0; i < strs.length; i++) if (r[strs[i]] != null && (typeof r[strs[i]] !== 'string' || r[strs[i]].length > 2000)) return 'bad ' + strs[i];
  if (r.date && !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return 'bad date';
  if (r.thumb && !/^https:\/\/www\.stardom-world\.com\//.test(r.thumb)) return 'bad thumb';
  var arrs = ['sides_en', 'sides_ja', 'shows', 'tags', 'access', 'lines'];
  for (var j = 0; j < arrs.length; j++) if (r[arrs[j]] != null && !Array.isArray(r[arrs[j]])) return 'bad ' + arrs[j];
  if (JSON.stringify(r).length > 40000) return 'too big';
  return '';
}

function sheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(SHEET);
  if (!sh) { sh = ss.insertSheet(SHEET); }
  if (sh.getLastRow() === 0) { sh.appendRow(COLS); sh.setFrozenRows(1); }
  return sh;
}

function put(r, app) {
  var sh = sheet(), now = new Date().toISOString();
  var show = (r.shows && r.shows[0]) || {};
  var row = {
    id: r.id, last_seen: now, date: r.date || show.date || '', no: r.no == null ? '' : r.no,
    title_en: r.title_en || '', title_ja: r.title_ja || '',
    sides_en: r.sides_en || [], teams_en: r.teams_en || [], notes_en: r.notes_en || [],
    sides_ja: r.sides_ja || [], teams_ja: r.teams_ja || [], notes_ja: r.notes_ja || [],
    show: show.show || '', show_date: show.date || '', venue: show.venue || '', set_id: show.id || '',
    tags: r.tags || [], access: r.access || [], thumb: r.thumb || '', lines: r.lines || [], app: app, rec: r
  };
  var found = sh.getRange(2, 1, Math.max(1, sh.getLastRow() - 1), 1).createTextFinder(String(r.id)).matchEntireCell(true).findNext();
  var values = COLS.map(function(c) {
    var v = row[c];
    if (JSON_COLS[c]) v = JSON.stringify(v);
    v = v == null ? '' : v;
    return typeof v === 'string' && v.length > MAX_CELL ? v.slice(0, MAX_CELL) : v;
  });
  if (found) {
    var n = found.getRow(), old = sh.getRange(n, 1, 1, COLS.length).getValues()[0];
    values[COLS.indexOf('first_seen')] = old[COLS.indexOf('first_seen')] || now;
    values[COLS.indexOf('times_seen')] = (Number(old[COLS.indexOf('times_seen')]) || 0) + 1;
    sh.getRange(n, 1, 1, COLS.length).setValues([values]);
    return { ok: true, id: r.id, updated: true };
  }
  values[COLS.indexOf('first_seen')] = now;
  values[COLS.indexOf('times_seen')] = 1;
  sh.appendRow(values);
  return { ok: true, id: r.id, added: true };
}

function exportRows() {
  var sh = sheet(), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, COLS.length).getValues().map(function(v) {
    var o = {};
    COLS.forEach(function(c, i) {
      var x = v[i];
      if (JSON_COLS[c] && typeof x === 'string' && x) { try { x = JSON.parse(x); } catch (e) {} }
      if (x instanceof Date) x = x.toISOString();
      o[c] = x;
    });
    return o;
  });
}

function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
