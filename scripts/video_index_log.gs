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
 *
 * Favorites sync (2.27.0, same key): a "favorites" tab with one row per saved item, so the private build on several
 * TVs shares one set of favorites. Each row has the item's key, its value, the time the device changed it (t),
 * whether it was removed, and a server counter (seq) so a device can ask for "changes since" without trusting clocks.
 *   fav_replace {items: [{key, value}], device}            the base device's whole set; replaces the tab
 *   fav_put     {changes: [{key, value, t, deleted}], device} newer change per key wins (by t)
 *   fav_since   {since: seq}                                rows changed after seq, the current seq and the row count
 *
 * Team match lists (2.28.5, same key): a "teammatches" tab with one row per tag team, holding the 2-on-2 matches its
 * team page has found on the site, so the private build's TVs read them instead of searching the site again.
 *   tm_get    {team}                                         that team's row: items, where the search got to, when
 *   tm_put    {team, items: [{id, t, b}], next: {qi, page, done}, query, fresh}  adds new items, keeps the old ones
 *   tm_export {}                                             every team's row (for analysis)
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
  // Reads don't wait for the lock. Writes wait up to 25 s, then answer "busy" (the app keeps the change and sends it later)
  // rather than failing with Apps Script's lock timeout error.
  if (body.action === 'tm_get' || body.action === 'tm_export') return out(tmAction(body));
  if (body.action === 'tm_put') return out(withLock(function() { return tmAction(body); }));
  if (body.action === 'fav_since') return out(favAction(body));
  if (body.action === 'fav_replace' || body.action === 'fav_put') return out(withLock(function() { return favAction(body); }));
  if (body.action !== 'put') return out({ ok: false, error: 'bad action' });
  var rec = body.rec, why = check(rec);
  if (why) return out({ ok: false, error: why });
  return out(withLock(function() { return put(rec, String(body.app || '')); }));
}

function withLock(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return { ok: false, error: 'busy', busy: true };
  try { return fn(); } finally { lock.releaseLock(); }
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

// ---- favorites sync -------------------------------------------------------------------------------------------
var FAV_SHEET = 'favorites';
var FAV_COLS = ['key', 'value', 't', 'deleted', 'seq', 'device', 'updated'];

function favSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(FAV_SHEET);
  if (!sh) sh = ss.insertSheet(FAV_SHEET);
  if (sh.getLastRow() === 0) { sh.appendRow(FAV_COLS); sh.setFrozenRows(1); }
  return sh;
}
function nextSeq() {
  var pr = PropertiesService.getScriptProperties(), n = (Number(pr.getProperty('FAV_SEQ')) || 0) + 1;
  pr.setProperty('FAV_SEQ', String(n));
  return n;
}
function favKeyOk(k) { return typeof k === 'string' && k.length > 0 && k.length <= 300 && /^(w|fs|tt|later|m|s|pl|pli|rem|ppv|own):/.test(k); }
function favValue(v) { var j = JSON.stringify(v == null ? null : v); return j.length > 20000 ? null : j; }

function favAction(b) {
  var sh = favSheet(), device = String(b.device || '').slice(0, 40), now = new Date().toISOString();
  if (b.action === 'fav_since') {
    var since = Number(b.since) || 0, n = sh.getLastRow(), rows = [];
    if (n > 1) sh.getRange(2, 1, n - 1, FAV_COLS.length).getValues().forEach(function(v) {
      if (Number(v[4]) > since) { var val = null; try { val = JSON.parse(v[1]); } catch (e) {} rows.push({ key: v[0], value: val, t: Number(v[2]) || 0, deleted: v[3] === true || v[3] === 'TRUE' }); }
    });
    var pr = PropertiesService.getScriptProperties();
    return { ok: true, seq: Number(pr.getProperty('FAV_SEQ')) || 0, replacedAt: Number(pr.getProperty('FAV_REPLACED')) || 0, rows: rows, total: Math.max(0, n - 1) };
  }
  if (b.action === 'fav_replace') {
    if (!Array.isArray(b.items) || b.items.length > 5000) return { ok: false, error: 'bad items' };
    var seq = nextSeq(), t = Date.now(), out = [];
    for (var i = 0; i < b.items.length; i++) {
      var it = b.items[i], j = it && favKeyOk(it.key) ? favValue(it.value) : null;
      if (j == null) return { ok: false, error: 'bad item ' + i };
      out.push([it.key, j, t, false, seq, device, now]);
    }
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, FAV_COLS.length).clearContent();
    if (out.length) sh.getRange(2, 1, out.length, FAV_COLS.length).setValues(out);
    var extra = sh.getLastRow() - 1 - out.length;
    if (extra > 0) sh.deleteRows(2 + out.length, extra);
    PropertiesService.getScriptProperties().setProperty('FAV_REPLACED', String(seq));   // devices synced before this take the whole set again
    return { ok: true, seq: seq, count: out.length };
  }
  // fav_put
  if (!Array.isArray(b.changes) || b.changes.length > 1000) return { ok: false, error: 'bad changes' };
  var n2 = sh.getLastRow(), have = {}, data = n2 > 1 ? sh.getRange(2, 1, n2 - 1, FAV_COLS.length).getValues() : [];
  data.forEach(function(v, i) { have[v[0]] = i; });
  var seq2 = nextSeq(), applied = 0, add = [], added = {};
  b.changes.forEach(function(c) {
    if (!c || !favKeyOk(c.key)) return;
    var t = Number(c.t) || Date.now(), del = !!c.deleted, j = del ? 'null' : favValue(c.value);
    if (j == null) return;
    var row = [c.key, j, t, del, seq2, device, now];
    var target = (c.key in have) ? data : (c.key in added) ? add : null;
    if (target) {
      var i = (c.key in have) ? have[c.key] : added[c.key];
      if ((Number(target[i][2]) || 0) > t) return;         // the sheet has a newer change for this item
      target[i] = row;
    } else { added[c.key] = add.length; add.push(row); }
    applied++;
  });
  if (data.length) sh.getRange(2, 1, data.length, FAV_COLS.length).setValues(data);
  if (add.length) sh.getRange(2 + data.length, 1, add.length, FAV_COLS.length).setValues(add);
  return { ok: true, seq: seq2, applied: applied };
}

// ---- team match lists ----------------------------------------------------------------------------------------
var TM_SHEET = 'teammatches';
var TM_COLS = ['team', 'count', 'items', 'next', 'searched', 'refreshed', 'device', 'queries'];
var TM_MAX = 150;   // newest first; keeps a team's row well inside the 50,000-character cell limit

function tmSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(TM_SHEET);
  if (!sh) sh = ss.insertSheet(TM_SHEET);
  if (sh.getLastRow() === 0) { sh.appendRow(TM_COLS); sh.setFrozenRows(1); }
  return sh;
}
function tmRow(sh, team) {
  var n = sh.getLastRow();
  if (n < 2) return null;
  var f = sh.getRange(2, 1, n - 1, 1).createTextFinder(team).matchEntireCell(true).findNext();
  return f ? f.getRow() : null;
}
function tmParse(v, d) { try { return JSON.parse(v); } catch (e) { return d; } }
function tmItemOk(x) { return x && /^\d{1,9}$/.test(String(x.id)) && typeof x.t === 'string' && x.t.length <= 300 && (!x.b || (typeof x.b === 'string' && x.b.length <= 400)); }

function tmAction(b) {
  var sh = tmSheet(), now = new Date().toISOString();
  if (b.action === 'tm_export') {
    var n = sh.getLastRow(), rows = [];
    if (n > 1) sh.getRange(2, 1, n - 1, TM_COLS.length).getValues().forEach(function(v) {
      var o = {}; TM_COLS.forEach(function(c, i) { o[c] = (c === 'items' || c === 'next' || c === 'queries') ? tmParse(v[i], null) : (v[i] instanceof Date ? v[i].toISOString() : v[i]); }); rows.push(o);
    });
    return { ok: true, rows: rows };
  }
  var team = String(b.team || '');
  if (!/^[a-z0-9-]{1,80}$/.test(team)) return { ok: false, error: 'bad team' };
  var r = tmRow(sh, team);
  if (b.action === 'tm_get') {
    if (!r) return { ok: true, found: false };
    var v = sh.getRange(r, 1, 1, TM_COLS.length).getValues()[0];
    return { ok: true, found: true, items: tmParse(v[2], []), next: tmParse(v[3], null), searched: v[4] instanceof Date ? v[4].toISOString() : v[4], refreshed: v[5] instanceof Date ? v[5].toISOString() : v[5], queries: tmParse(v[7], []) };
  }
  // tm_put
  if (!Array.isArray(b.items) || b.items.length > 100) return { ok: false, error: 'bad items' };
  var add = b.items.filter(tmItemOk).map(function(x) { return { id: String(x.id), t: x.t, b: x.b || '' }; });
  var old = r ? tmParse(sh.getRange(r, 3).getValue(), []) : [], seen = {};
  old.forEach(function(x) { seen[x.id] = 1; });
  var fresh = add.filter(function(x) { return !seen[x.id]; });
  // a refresh of the newest page puts new matches first; later pages go after what is there
  var items = (b.fresh ? fresh.concat(old) : old.concat(fresh)).slice(0, TM_MAX);
  var prev = r ? sh.getRange(r, 1, 1, TM_COLS.length).getValues()[0] : null;
  var queries = prev ? tmParse(prev[7], []) : [];
  if (b.query && queries.indexOf(String(b.query).slice(0, 200)) < 0) queries.push(String(b.query).slice(0, 200));
  var next = b.next && typeof b.next === 'object' ? { qi: Number(b.next.qi) || 0, page: Number(b.next.page) || 1, done: !!b.next.done } : (prev ? tmParse(prev[3], null) : null);
  if (b.fresh && prev) next = tmParse(prev[3], next);   // a refresh doesn't move where the deeper search got to
  var row = [team, items.length, JSON.stringify(items), JSON.stringify(next), b.fresh && prev ? prev[4] : now, now, String(b.device || '').slice(0, 40), JSON.stringify(queries)];
  if (r) sh.getRange(r, 1, 1, TM_COLS.length).setValues([row]); else sh.appendRow(row);
  return { ok: true, added: fresh.length, count: items.length };
}
