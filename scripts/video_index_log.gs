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
 *
 * Category debug (2.43.0, same key): a "debug" tab, one row per search a private build's category tab made (wrestler
 * and tag team pages), so the title rules can be checked from the sheet instead of photos. Kept to the newest 500 rows.
 *   dbg_put    {page, subject, tab, url, record, device}       adds a row
 *   dbg_export {}                                              every row (scripts/video_index_pull.py --debug)
 *
 * Match index (2.45.0, same key; see docs/MATCH_INDEX.md): the curated tabs behind the private build's Index panel.
 *   vi_lib     {}                                              approved names and lists; applies approved proposals first
 *   vi_get     {video}                                         the match this video belongs to, and who else is on that show
 *   vi_save    {video, version, match, participants, aliases}  saves a reviewed match; links duplicates by date and sides
 *   vi_propose {type, value, video}                            adds a row to proposals for approval in the sheet;
 *                                                              from the owner's private build it is applied at once
 *   vi_export  {}                                              compiled index: ids and tags, with results kept apart
 *   vi_cards   {}                                              one entry per logged video for the StarScope cards and player:
 *                                                              names, event, match number, show, venue, bell and end times (2.65.0),
 *                                                              match id, round and special rules for the Shows page (2.66.0)
 *   vi_suggest {}                                              StarScope's Log next tab (2.67.0): videos watched but not logged,
 *                                                              by show (set), with views, last watched and the venue's names
 *
 * StarScope on the phone (2.68.0, see docs/STARSCOPE_PHONE.md):
 *   pb_put {video, set, events: [{ts, ev, pos, playing, rate}], info}  the TV's play / pause / seek record ("playback" tab);
 *                                                              only the current video and the one before it are kept
 *   GET ?p=phone&k=KEY                                         the phone logger page (the "phone" HTML file in this project);
 *                                                              its calls (phoneNow, phoneLib, phoneGet, phoneSave, phonePropose)
 *                                                              need the same key
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
  if (body.action === 'dbg_put') return out(withLock(function() { return dbgPut(body); }));
  if (body.action === 'dbg_export') return out(dbgExport());
  if (body.action === 'vi_get') return out(viGet(body));
  if (body.action === 'vi_export') return out(viExport());
  if (body.action === 'vi_cards') return out(viCards());
  if (body.action === 'vi_suggest') return out(viSuggest());
  if (body.action === 'vi_roster') return out(viRoster());
  if (body.action === 'pb_put') return out(withLock(function() { return pbPut(body); }));
  if (body.action === 'vi_lib' || body.action === 'vi_save' || body.action === 'vi_propose') return out(withLock(function() { return viAction(body); }));
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

// The only page: the StarScope phone logger, for the owner's key. Anything else gets the same answer as before.
function doGet(e) {
  var p = (e && e.parameter) || {}, key = PropertiesService.getScriptProperties().getProperty('KEY');
  if (p.p !== 'phone' || !key || p.k !== key) return out({ ok: false, error: 'POST only' });
  var t = HtmlService.createTemplateFromFile('phone');
  t.k = p.k;
  return t.evaluate().setTitle('StarScope').addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

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


// ---- category debug rows (2.43.0)
var DBG_SHEET = 'debug', DBG_COLS = ['time', 'device', 'page', 'subject', 'tab', 'url', 'record'], DBG_KEEP = 500;
function dbgSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(DBG_SHEET);
  if (!sh) { sh = ss.insertSheet(DBG_SHEET); sh.appendRow(DBG_COLS); sh.setFrozenRows(1); }
  return sh;
}
function dbgPut(b) {
  var sh = dbgSheet(), rec = JSON.stringify(b.record || {});
  if (rec.length > MAX_CELL) rec = rec.slice(0, MAX_CELL);
  sh.appendRow([new Date().toISOString(), String(b.device || '').slice(0, 40), String(b.page || '').slice(0, 20), String(b.subject || '').slice(0, 120),
    String(b.tab || '').slice(0, 30), String(b.url || '').slice(0, 500), rec]);
  var extra = sh.getLastRow() - 1 - DBG_KEEP;
  if (extra > 0) sh.deleteRows(2, extra);
  return { ok: true };
}
function dbgExport() {
  var sh = dbgSheet(), n = sh.getLastRow() - 1, rows = [];
  if (n > 0) sh.getRange(2, 1, n, DBG_COLS.length).getValues().forEach(function(v) {
    var o = {}; DBG_COLS.forEach(function(c, i) { o[c] = v[i] instanceof Date ? v[i].toISOString() : v[i]; });
    try { o.record = JSON.parse(o.record); } catch (e) {}
    rows.push(o);
  });
  return { ok: true, rows: rows };
}

// ---- match index (2.45.0) -------------------------------------------------------------------------------------
// Raw captures stay in "videos". These tabs hold reviewed data; every id is permanent and nothing is deleted.
var VI = {
  matches: ['match_id', 'show_id', 'date', 'card_no', 'is_dark', 'result_type', 'winner_side', 'level', 'status', 'source', 'device', 'updated', 'merged_into', 'note', 'date_set', 'card_total'],
  match_videos: ['match_id', 'video_id', 'version', 'start_sec', 'bell_sec', 'end_sec', 'source', 'updated'],
  participants: ['match_id', 'side_no', 'slot', 'talent_id', 'billed_name', 'role', 'team_id', 'faction_id', 'result', 'entry_order', 'elim_order', 'source', 'updated'],
  match_tags: ['match_id', 'tag_group', 'tag_value', 'source', 'confidence', 'updated'],
  shows: ['show_id', 'name', 'date', 'series', 'venue_id', 'venue_raw', 'active', 'merged_into', 'note'],
  venues: ['venue_id', 'name_en', 'name_ja', 'prefecture', 'active', 'merged_into', 'note'],
  talent: ['talent_id', 'name_en', 'name_ja', 'search', 'status', 'active', 'merged_into', 'note'],
  teams: ['team_id', 'name_en', 'name_ja', 'member_ids', 'active', 'merged_into', 'note'],
  factions: ['faction_id', 'name_en', 'name_ja', 'active', 'merged_into', 'note'],
  aliases: ['alias', 'normalized', 'entity_type', 'entity_id', 'lang', 'valid_from', 'valid_to', 'source', 'status'],
  lists: ['list', 'value_id', 'label_en', 'label_ja', 'parent', 'match_keywords', 'sort', 'active'],
  proposals: ['proposal_id', 'time', 'type', 'value', 'entity_id', 'video_id', 'match_id', 'device', 'status', 'decided', 'note'],
  changes: ['time', 'match_id', 'tab', 'field', 'old', 'new', 'source', 'device'],
  // One star rating (1 to 5) per match per device: your own, and the average of everyone's (2.62.0).
  ratings: ['match_id', 'device', 'stars', 'updated']
};
function viSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(VI[name]); sh.setFrozenRows(1); }
  return sh;
}
function viCell(v) { return v instanceof Date ? Utilities.formatDate(v, 'UTC', 'yyyy-MM-dd') : v; }
function viRows(name) {
  var sh = viSheet(name), n = sh.getLastRow(), cols = VI[name];
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, cols.length).getValues().map(function(v, i) {
    var o = { _row: i + 2 };
    cols.forEach(function(c, j) { o[c] = viCell(v[j]); });
    return o;
  });
}
function viAppend(name, rows) {
  if (!rows.length) return;
  var sh = viSheet(name), cols = VI[name], start = sh.getLastRow() + 1;
  if (start + rows.length - 1 > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), Math.max(rows.length, 500));
  sh.getRange(start, 1, rows.length, cols.length).setNumberFormat('@').setValues(rows.map(function(r) {
    return cols.map(function(c) { return r[c] == null ? '' : String(r[c]); });
  }));
}
function viTrue(v) { return v === true || String(v).toUpperCase() === 'TRUE' || v === '' ; }
function viNorm(s) { return String(s || '').normalize('NFKC').toLowerCase().replace(/[\s・·.．★☆_-]+/g, ''); }
function viSlug(s) { return String(s || '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

// Sets a row's cells by column name.
function viSet(name, row, fields) {
  var sh = viSheet(name), cols = VI[name];
  Object.keys(fields).forEach(function(k) { sh.getRange(row, cols.indexOf(k) + 1).setNumberFormat('@').setValue(String(fields[k])); });
}

// A proposal set to "approved" in the sheet goes into the library the next time the library is read, then reads "applied".
// Returns the new library id for each proposal it applied.
function viApplyApproved() {
  var now = new Date().toISOString(), made = {};
  viRows('proposals').forEach(function(p) {
    var made1 = '';
    if (p.status !== 'approved') return;
    if (p.type === 'new_talent') {
      var id = p.entity_id || viSlug(p.value);
      if (!id) id = 't' + p.proposal_id;
      made1 = id;
      if (!viRows('talent').some(function(t) { return t.talent_id === id; })) viAppend('talent', [{ talent_id: id, name_en: p.value, search: p.value, status: 'guest', active: 'TRUE', note: 'proposal ' + p.proposal_id }]);
    } else if (p.type === 'new_alias' && p.entity_id) {
      made1 = p.entity_id;
      viAppend('aliases', [{ alias: p.value, normalized: viNorm(p.value), entity_type: 'talent', entity_id: p.entity_id, source: 'proposal', status: 'approved' }]);
    } else if (p.type === 'new_team') {
      // entity_id holds the partners, a|b, as the panel sent them.
      made1 = viSlug(p.value) || ('t' + p.proposal_id);
      viAppend('teams', [{ team_id: made1, name_en: p.value, member_ids: p.entity_id, active: 'TRUE', note: 'proposal ' + p.proposal_id }]);
    } else if (p.type === 'new_option' && p.entity_id) {
      made1 = viSlug(p.value) || ('o' + p.proposal_id);
      viAppend('lists', [{ list: p.entity_id, value_id: made1, label_en: p.value, active: 'TRUE' }]);
    } else if (p.type === 'new_venue') {
      var ja = /[^\x00-\x7F]/.test(p.value);
      made1 = viSlug(p.value) || ('v' + p.proposal_id);
      viAppend('venues', [{ venue_id: made1, name_en: ja ? '' : p.value, name_ja: ja ? p.value : '', active: 'TRUE', note: 'proposal ' + p.proposal_id }]);
    } else if (p.type === 'new_faction') {
      made1 = p.entity_id || viSlug(p.value);
      viAppend('factions', [{ faction_id: made1, name_en: p.value, active: 'TRUE', note: 'proposal ' + p.proposal_id }]);
    } else return;
    viSet('proposals', p._row, { status: 'applied', decided: now });
    made[p.proposal_id] = made1;
  });
  return made;
}

// The Wrestlers menu (2.64.0): every wrestler with her status (current, past, guest) and how many StarScope matches
// she is in. Read only, no lock, so it never answers "busy". A merged name's matches count for the name it points to.
function viRoster() {
  var tal = viRows('talent'), to = {}, n = {}, seen = {};
  tal.forEach(function(t) { if (t.merged_into) to[t.talent_id] = t.merged_into; });
  viRows('participants').forEach(function(p) {
    var id = to[p.talent_id] || p.talent_id, k = p.match_id + '|' + id;
    if (!id || seen[k]) return;
    seen[k] = 1; n[id] = (n[id] || 0) + 1;
  });
  return {
    ok: true, at: new Date().toISOString(),
    talent: tal.filter(function(t) { return viTrue(t.active) && !t.merged_into; }).map(function(t) {
      return { id: t.talent_id, en: t.name_en, ja: t.name_ja, s: t.search, st: String(t.status || '').toLowerCase(), n: n[t.talent_id] || 0 };
    }),
    // other names for the same person (HZK is Hazuki, Azumi is AZM): the menu leaves these out
    merged: tal.filter(function(t) { return t.merged_into; }).map(function(t) { return [t.name_en, t.search, t.merged_into]; })
  };
}

function viAction(b) {
  if (b.action === 'vi_lib') {
    viApplyApproved();
    var lists = {};
    viRows('lists').forEach(function(l) { if (viTrue(l.active)) (lists[l.list] = lists[l.list] || []).push({ id: l.value_id, en: l.label_en, ja: l.label_ja, p: l.parent, k: l.match_keywords }); });
    return {
      ok: true, at: new Date().toISOString(), lists: lists,
      talent: viRows('talent').filter(function(t) { return viTrue(t.active) && !t.merged_into; }).map(function(t) { return { id: t.talent_id, en: t.name_en, ja: t.name_ja, s: t.search, st: t.status }; }),
      merged: viRows('talent').filter(function(t) { return t.merged_into; }).map(function(t) { return [t.talent_id, t.merged_into]; }),
      aliases: viRows('aliases').filter(function(a) { return a.status !== 'rejected' && a.entity_type === 'talent'; }).map(function(a) { return [a.normalized || viNorm(a.alias), a.entity_id]; }),
      venueAliases: viRows('aliases').filter(function(a) { return a.status !== 'rejected' && a.entity_type === 'venue'; }).map(function(a) { return [a.normalized || viNorm(a.alias), a.entity_id]; }),
      venues: viRows('venues').filter(function(v) { return viTrue(v.active) && !v.merged_into; }).map(function(v) { return { id: v.venue_id, en: v.name_en || v.name_ja, ja: v.name_ja, p: v.prefecture }; }),
      teams: viRows('teams').filter(function(t) { return viTrue(t.active) && !t.merged_into; }).map(function(t) { return { id: t.team_id, en: t.name_en, m: String(t.member_ids || '').split('|').filter(String) }; }),
      factions: viRows('factions').filter(function(f) { return viTrue(f.active) && !f.merged_into; }).map(function(f) { return { id: f.faction_id, en: f.name_en, ja: f.name_ja }; })
    };
  }
  if (b.action === 'vi_propose') {
    var type = String(b.type || ''), value = String(b.value || '').slice(0, 120);
    if (!/^new_(talent|alias|team|faction|option|venue)$/.test(type) || !value) return { ok: false, error: 'bad proposal' };
    // The owner's private build (the app adds owner, with the key) skips approval: the addition goes in now.
    // Any other sender, as the public build will be, still waits for approval in the sheet.
    var owner = b.owner === true, same = function(p) { return p.type === type && String(p.entity_id) === String(b.entity_id || '') && viNorm(p.value) === viNorm(value); };
    var dup = viRows('proposals').filter(function(p) { return same(p) && (p.status === 'pending' || p.status === 'approved' || (owner && p.status === 'applied')); })[0];
    var pid = dup ? dup.proposal_id : 'p' + Date.now();
    if (dup && !owner) return { ok: true, duplicate: true };
    if (dup && dup.status === 'applied') return { ok: true, applied: true, id: viApplyIdOf(dup) };
    if (dup) viSet('proposals', dup._row, { status: 'approved', note: 'owner build' });
    else viAppend('proposals', [{ proposal_id: pid, time: new Date().toISOString(), type: type, value: value, entity_id: String(b.entity_id || '').slice(0, 300), video_id: String(b.video || ''), device: String(b.device || '').slice(0, 40), status: owner ? 'approved' : 'pending', note: owner ? 'owner build' : '' }]);
    if (!owner) return { ok: true, added: true };
    return { ok: true, applied: true, id: viApplyApproved()[pid] || '' };
  }
  return viSave(b);
}

// The library id an already-applied proposal made, found from its note.
function viApplyIdOf(p) {
  var note = 'proposal ' + p.proposal_id, hit = '';
  if (p.type === 'new_alias') return p.entity_id;
  var tab = { new_talent: ['talent', 'talent_id'], new_team: ['teams', 'team_id'], new_venue: ['venues', 'venue_id'], new_faction: ['factions', 'faction_id'] }[p.type];
  if (tab) viRows(tab[0]).forEach(function(r) { if (r.note === note) hit = r[tab[1]]; });
  if (!hit && p.type === 'new_talent') hit = p.entity_id || viSlug(p.value);
  if (!hit && p.type === 'new_option') viRows('lists').forEach(function(l) { if (l.list === p.entity_id && viNorm(l.label_en) === viNorm(p.value)) hit = l.value_id; });
  return hit;
}

function viKey(date, parts) {
  var sides = {};
  parts.forEach(function(p) { (sides[p.side_no] = sides[p.side_no] || []).push(p.talent_id || viNorm(p.billed_name)); });
  return date + '|' + Object.keys(sides).map(function(k) { return sides[k].sort().join('+'); }).sort().join(' v ');
}
function viFindMatch(video) {
  var hit = viRows('match_videos').filter(function(v) { return String(v.video_id) === String(video); })[0];
  return hit ? String(hit.match_id) : '';
}
function viResolveMerged(id, matches) {
  var seen = {}, m;
  while (id && !seen[id]) {
    seen[id] = 1;
    m = matches.filter(function(x) { return x.match_id === id; })[0];
    if (!m || !m.merged_into) return id;
    id = m.merged_into;
  }
  return id;
}

function viGet(b) {
  var video = String(b.video || '');
  if (!/^\d{1,9}$/.test(video)) return { ok: false, error: 'bad video' };
  var all = viRows('matches'), id = viResolveMerged(viFindMatch(video), all), showId = String(b.show || '');
  var parts = viRows('participants'), onShow = {};
  if (showId) {
    var inShow = {};
    all.forEach(function(m) { if (String(m.show_id) === showId) inShow[m.match_id] = 1; });
    parts.forEach(function(p) { if (inShow[p.match_id] && p.talent_id) onShow[p.talent_id] = 1; });
  }
  var res = { ok: true, found: false, onShow: Object.keys(onShow) };
  if (showId) res.show = viRows('shows').filter(function(x) { return String(x.show_id) === showId; })[0] || null;
  if (!id) return res;
  var m = all.filter(function(x) { return x.match_id === id; })[0];
  if (!m) return res;
  res.found = true;
  res.match = m;
  res.participants = parts.filter(function(p) { return p.match_id === id; }).sort(function(x, y) { return (x.side_no - y.side_no) || (x.slot - y.slot); });
  res.videos = viRows('match_videos').filter(function(v) { return v.match_id === id; });
  res.tags = viRows('match_tags').filter(function(t) { return t.match_id === id; });
  var rs = viRows('ratings').filter(function(r) { return r.match_id === id && Number(r.stars) >= 1; }), dev = String(b.device || '').slice(0, 40);
  res.myRating = (rs.filter(function(r) { return String(r.device) === dev; })[0] || {}).stars || 0;
  res.ratingCount = rs.length;
  res.ratingAvg = rs.length ? (Math.round(rs.reduce(function(a, r) { return a + Number(r.stars); }, 0) / rs.length * 10) / 10).toFixed(1) : '';
  return res;
}

// This device's star rating for a match: 1 to 5 sets it, 0 takes it away.
function viRate(id, device, stars, now) {
  if (!device || !(stars >= 0 && stars <= 5)) return;
  var mine = viRows('ratings').filter(function(r) { return r.match_id === id && String(r.device) === device; });
  if (mine.length) {
    if (stars) viSet('ratings', mine[0]._row, { stars: stars, updated: now });
    else viSheet('ratings').deleteRow(mine[0]._row);
  } else if (stars) viAppend('ratings', [{ match_id: id, device: device, stars: stars, updated: now }]);
}

function viSave(b) {
  var video = String(b.video || ''), m = b.match || {}, list = b.participants;
  if (!/^\d{1,9}$/.test(video)) return { ok: false, error: 'bad video' };
  if (!Array.isArray(list) || !list.length || list.length > 60) return { ok: false, error: 'bad participants' };
  var date = /^\d{4}-\d{2}-\d{2}$/.test(m.date || '') ? m.date : '';
  var known = {}; viRows('talent').forEach(function(t) { known[t.talent_id] = 1; });
  var ok = true, sideSet = {};
  list.forEach(function(p) {
    if (!p || !(Number(p.side) >= 1) || (p.talent_id && !known[p.talent_id])) ok = false;
    else sideSet[p.side] = 1;
  });
  if (!ok) return { ok: false, error: 'a name is not in the library' };
  if (Object.keys(sideSet).length < 2) return { ok: false, error: 'a match needs two sides' };
  var version = /^(jp|en|digest|full)$/.test(b.version || '') ? b.version : 'jp';
  var now = new Date().toISOString(), device = String(b.device || '').slice(0, 40);
  var resultType = /^(win|draw|nc)$/.test(m.result_type || '') ? m.result_type : '';
  var winner = resultType === 'win' && sideSet[m.winner_side] ? Number(m.winner_side) : '';
  if (resultType === 'win' && !winner) resultType = '';
  var pending = list.some(function(p) { return !p.talent_id; });
  var rows = list.map(function(p) {
    var r = '';
    if (resultType === 'win') r = Number(p.side) === winner ? 'win' : 'loss';
    else if (resultType) r = resultType;
    return { side_no: Number(p.side), slot: Number(p.slot) || 1, talent_id: p.talent_id || '', billed_name: String(p.billed || '').slice(0, 120),
      role: /^(champion|challenger)$/.test(p.role || '') ? p.role : '', team_id: String(p.team_id || '').slice(0, 80), faction_id: String(p.faction_id || '').slice(0, 80),
      result: r, entry_order: Number(p.entry) > 0 ? Number(p.entry) : '', elim_order: Number(p.elim) > 0 ? Number(p.elim) : '', source: 'panel', updated: now };
  });

  var matches = viRows('matches'), id = viResolveMerged(viFindMatch(video), matches), linked = false;
  if (!id && date) {
    // The same people on the same date is the same match: another version of it (English commentary, digest).
    var key = viKey(date, rows), byMatch = {};
    viRows('participants').forEach(function(p) { (byMatch[p.match_id] = byMatch[p.match_id] || []).push(p); });
    matches.forEach(function(x) { if (!id && !x.merged_into && x.date === date && byMatch[x.match_id] && viKey(date, byMatch[x.match_id]) === key) id = x.match_id; });
    linked = !!id;
  }
  var fresh = !id;
  if (fresh) id = 'm' + video;
  rows.forEach(function(r) { r.match_id = id; });

  // Old rows out, new rows in, the difference noted in changes.
  var oldParts = viRows('participants').filter(function(p) { return p.match_id === id; });
  var sum = function(a) { return a.slice().sort(function(x, y) { return (x.side_no - y.side_no) || (x.slot - y.slot); }).map(function(p) { return [p.side_no, p.slot, p.talent_id, p.role, p.result].join(':'); }).join(' '); };
  var before = sum(oldParts), after = sum(rows), log = [];
  var psh = viSheet('participants');
  oldParts.map(function(p) { return p._row; }).sort(function(a, c) { return c - a; }).forEach(function(n) { psh.deleteRow(n); });
  viAppend('participants', rows);
  if (before !== after) log.push({ time: now, match_id: id, tab: 'participants', field: 'sides', old: before, 'new': after, source: 'panel', device: device });

  var level = Math.max(1, Math.min(3, Number(m.level) || 1));
  var fields = { show_id: m.show_id == null ? '' : m.show_id, date: date, card_no: m.card_no == null ? '' : m.card_no, is_dark: m.is_dark ? 'TRUE' : 'FALSE',
    card_total: Number(m.card_total) > 0 ? Number(m.card_total) : '', result_type: resultType, winner_side: winner, level: level, status: pending ? 'needs_name' : 'reviewed', source: 'panel', device: device, updated: now };
  if (fresh) {
    fields.date_set = m.date_manual ? 'manual' : '';
    var row = { match_id: id }; Object.keys(fields).forEach(function(k) { row[k] = fields[k]; });
    viAppend('matches', [row]);
  } else {
    var old = viRows('matches').filter(function(x) { return x.match_id === id; })[0];
    if (old) {
      if (Number(old.level) > level) { fields.level = old.level; level = Number(old.level); }
      // A re-save from outside the set keeps the match's place on the card.
      if (fields.card_no === '' && old.card_no !== '') fields.card_no = old.card_no;
      if (fields.card_total === '' && old.card_total !== '') fields.card_total = old.card_total;
      // A date corrected by hand stays until it is changed by hand.
      if (old.date_set === 'manual' && !m.date_manual) fields.date = old.date;
      fields.date_set = m.date_manual ? 'manual' : (old.date_set === 'manual' ? 'manual' : '');
      ['date', 'result_type', 'winner_side'].forEach(function(k) { if (String(old[k]) !== String(fields[k])) log.push({ time: now, match_id: id, tab: 'matches', field: k, old: old[k], 'new': fields[k], source: 'panel', device: device }); });
      viSet('matches', old._row, fields);
    }
  }
  var marks = b.marks || {}, sec = function(v) { return v === '' || v == null || !(Number(v) >= 0) ? '' : Math.floor(Number(v)); };
  var vids = viRows('match_videos').filter(function(v) { return String(v.video_id) === video; });
  if (vids.length) viSet('match_videos', vids[0]._row, { match_id: id, version: version, bell_sec: sec(marks.bell), end_sec: sec(marks.end), updated: now });
  else viAppend('match_videos', [{ match_id: id, video_id: video, version: version, bell_sec: sec(marks.bell), end_sec: sec(marks.end), source: 'panel', updated: now }]);

  // Tags: only values in the lists tab (and known wrestlers for the fall) are kept; this match's old tags are replaced.
  if (Array.isArray(b.tags)) {
    var okTag = {}; viRows('lists').forEach(function(l) { okTag[l.list + '/' + l.value_id] = 1; });
    var newTags = b.tags.slice(0, 40).filter(function(t) { return t && (t.group === 'fall' ? known[t.value] : okTag[t.group + '/' + t.value]); }).map(function(t) {
      return { match_id: id, tag_group: t.group, tag_value: t.value, source: t.source === 'auto' ? 'auto' : 'panel', confidence: t.source === 'auto' ? 'suggested' : 'confirmed', updated: now };
    });
    var oldTags = viRows('match_tags').filter(function(t) { return t.match_id === id; });
    var tagSum = function(a) { return a.map(function(t) { return t.tag_group + ':' + t.tag_value; }).sort().join(' '); };
    if (tagSum(oldTags) !== tagSum(newTags)) log.push({ time: now, match_id: id, tab: 'match_tags', field: 'tags', old: tagSum(oldTags), 'new': tagSum(newTags), source: 'panel', device: device });
    var tsh = viSheet('match_tags');
    oldTags.map(function(t) { return t._row; }).sort(function(x, y) { return y - x; }).forEach(function(n) { tsh.deleteRow(n); });
    viAppend('match_tags', newTags);
  }

  // First sighting of a show: remember its name and the venue as the site wrote it.
  if (fields.show_id !== '') {
    var okVenue = viRows('venues').some(function(v) { return v.venue_id === m.venue_id; }) ? m.venue_id : '';
    var sRow = viRows('shows').filter(function(x) { return String(x.show_id) === String(fields.show_id); })[0];
    if (!sRow) viAppend('shows', [{ show_id: fields.show_id, name: String(m.show_name || '').slice(0, 300), date: date, venue_id: okVenue, venue_raw: String(m.venue || '').slice(0, 200), active: 'TRUE' }]);
    else if (okVenue && sRow.venue_id !== okVenue) viSet('shows', sRow._row, { venue_id: okVenue });
  }
  if (Array.isArray(b.venueAliases) && b.venueAliases.length) {
    var vKnown = {}, aKnown = {};
    viRows('venues').forEach(function(v) { vKnown[v.venue_id] = 1; });
    viRows('aliases').forEach(function(a) { aKnown[a.normalized] = 1; });
    var vAdd = [];
    b.venueAliases.slice(0, 5).forEach(function(a) {
      var n = viNorm(a && a.raw);
      if (!n || aKnown[n] || !vKnown[a.id]) return;
      aKnown[n] = 1;
      vAdd.push({ alias: String(a.raw).slice(0, 200), normalized: n, entity_type: 'venue', entity_id: a.id, source: 'panel', status: 'approved' });
    });
    viAppend('aliases', vAdd);
  }
  // A spelling you matched to a person on the panel works from then on.
  if (Array.isArray(b.aliases) && b.aliases.length) {
    var have = {}; viRows('aliases').forEach(function(a) { have[a.normalized] = 1; });
    var add = [];
    b.aliases.slice(0, 40).forEach(function(a) {
      var n = viNorm(a && a.raw);
      if (!n || have[n] || !known[a.id]) return;
      have[n] = 1;
      add.push({ alias: String(a.raw).slice(0, 120), normalized: n, entity_type: 'talent', entity_id: a.id, source: 'panel', status: 'approved' });
    });
    viAppend('aliases', add);
  }
  viAppend('changes', log);
  viRate(id, device, Math.floor(Number(b.rating) || 0), now);
  return { ok: true, match_id: id, linked: linked, created: fresh, level: level, status: fields.status };
}

// What the private build's video cards show: names, event, block, round, match number, date. Never the result.
function viCards() {
  var label = {}, names = {}, parts = {}, tags = {}, m2 = {};
  viRows('lists').forEach(function(l) { label[l.list + '/' + l.value_id] = { en: l.label_en, ja: l.label_ja || l.label_en }; });
  viRows('talent').forEach(function(t) { names[t.talent_id] = { en: t.name_en, ja: t.name_ja || t.name_en }; });
  viRows('participants').forEach(function(p) { (parts[p.match_id] = parts[p.match_id] || []).push(p); });
  viRows('match_tags').forEach(function(t) { var o = tags[t.match_id] = tags[t.match_id] || {}; (o[t.tag_group] = o[t.tag_group] || []).push(t.tag_value); });
  viRows('matches').forEach(function(m) { if (!m.merged_into) m2[m.match_id] = m; });
  // What the site's search can see for each video: its titles and description.
  var seen = {}, vsh = sheet(), vn = vsh.getLastRow();
  if (vn > 1) {
    var iT = COLS.indexOf('thumb'), iL = COLS.indexOf('lines'), iE = COLS.indexOf('title_en'), iJ = COLS.indexOf('title_ja');
    vsh.getRange(2, 1, vn - 1, COLS.length).getValues().forEach(function(r) { seen[String(r[0])] = { text: viNorm([r[iE], r[iJ], r[iL]].join(' ')), th: r[iT] }; });
  }
  var keys = {}, words = {};
  viRows('talent').forEach(function(t) { keys[t.talent_id] = [t.name_en, t.search, t.name_ja].filter(String).map(viNorm); words[t.talent_id] = viNorm(t.search || t.name_en); });
  viRows('aliases').forEach(function(a) { if (a.entity_type === 'talent' && keys[a.entity_id]) keys[a.entity_id].push(a.normalized || viNorm(a.alias)); });
  function people(list, text) {
    var sides = [];
    list.slice().sort(function(a, b) { return (a.side_no - b.side_no) || (a.slot - b.slot); }).forEach(function(p) {
      var w = words[p.talent_id];
      (sides[p.side_no - 1] = sides[p.side_no - 1] || []).push([keys[p.talent_id] || [viNorm(p.billed_name)], !(w && text.indexOf(w) >= 0)]);
    });
    return sides.filter(Boolean);
  }
  function lab(g, v, lang) { var l = label[g + '/' + v]; return l ? l[lang] : v; }
  function sideList(list, lang) {
    var sides = [];
    list.slice().sort(function(a, b) { return (a.side_no - b.side_no) || (a.slot - b.slot); }).forEach(function(p) {
      var n = names[p.talent_id]; (sides[p.side_no - 1] = sides[p.side_no - 1] || []).push(n ? n[lang] : p.billed_name);
    });
    return sides.filter(Boolean);
  }
  // The kind of match, for the card (2.62.1): gauntlets, battle royals, rumbles, handicaps and multi-team
  // matches say so ("6-team gauntlet · 3 per team"). Same rules as kindOf in assets/indexpanel.js.
  function kind(s, lang, st) {
    st = st || [];
    var sizes = s.map(function(x) { return x.length; }), size = Math.max.apply(null, sizes.concat([0])), n = s.length, all = sizes.reduce(function(a, b) { return a + b; }, 0), J = lang === 'ja';
    if (st.indexOf('gauntlet') >= 0) return n > 2 && size > 1 ? (J ? n + 'チーム・ガントレット（' + size + '人）' : n + '-team gauntlet · ' + size + ' per team') : (J ? all + '人ガントレット' : all + '-wrestler gauntlet');
    if (st.indexOf('royal') >= 0) return J ? all + '人バトルロイヤル' : all + '-woman battle royal';
    if (st.indexOf('rumble') >= 0) return J ? all + '人ランブル' : all + '-woman rumble';
    if (n > 2) return size > 1 ? (J ? n + 'チーム（各' + size + '人）' : n + ' teams of ' + size) : (J ? n + 'WAY' : n + '-way match');
    if (n === 2 && sizes[0] !== sizes[1]) return J ? sizes[0] + '対' + sizes[1] + 'ハンディキャップ' : sizes[0] + '-on-' + sizes[1] + ' handicap';
    if (size === 1) return J ? 'シングルマッチ' : 'Singles match';
    if (size === 2) return J ? 'タッグマッチ' : 'Tag team match';
    return J ? (size * 2) + '人タッグ' : (size * 2) + '-person tag';
  }
  function big(s, st) { return s.length > 2 || (st || []).some(function(x) { return /^(gauntlet|royal|rumble)$/.test(x); }); }
  // Rules that are not the kind of match (2.65.2): Mixed Martial Arts, Ladder, Cage, Loser's Haircut and so on.
  // Gauntlets, battle royals, rumbles and handicaps are already said by kind(); a stipulation named like the title
  // (High Speed) is already said by the title. Same rules as specials() in assets/indexpanel.js.
  function specials(t, lang) {
    return (t.stipulation || []).filter(function(x) { return !/^(gauntlet|royal|rumble|handicap)$/.test(x) && (t.title || []).indexOf(x) < 0; })
      .map(function(x) { var l = String(lab('stipulation', x, lang)); return lang === 'ja' || /match$/i.test(l) ? l : l + ' match'; });
  }
  function event(m, t, s, lang) {
    if (t.competition) return lab('competition', t.competition[0], lang) + ' ' + String(m.date).slice(0, 4);
    if (t.title) return t.title.map(function(v) { return lab('title', v, lang); }).join(' / ');
    var sp = specials(t, lang);
    if (sp.length) return sp[0];
    return kind(s, lang, t.stipulation);
  }
  // Team or faction name per side, when every side has one: big matches show those instead of every wrestler.
  function teamNames(p, lang) {
    var by = [], ok = true, tn = {}, fn = {};
    viRows('teams').forEach(function(x) { tn[x.team_id] = lang === 'ja' && x.name_ja ? x.name_ja : x.name_en; });
    viRows('factions').forEach(function(x) { fn[x.faction_id] = lang === 'ja' && x.name_ja ? x.name_ja : x.name_en; });
    p.forEach(function(x) { var nm = tn[x.team_id] || fn[x.faction_id] || ''; if (!by[x.side_no - 1]) by[x.side_no - 1] = nm; });
    by = by.filter(function(x) { return x !== undefined; });
    by.forEach(function(x) { if (!x) ok = false; });
    return ok && by.length ? by : null;
  }
  function foot(t, lang, s) {
    var f = [];
    // A big match under a tournament or title still says what kind it is.
    if (s && big(s, t.stipulation) && (t.competition || t.title)) f.push(kind(s, lang, t.stipulation));
    var sp = specials(t, lang);
    if (t.competition || t.title) f = f.concat(sp);
    else if (sp.length) {
      // The rule is the headline: what kind of match it is goes underneath, unless it is a plain singles match.
      f = f.concat(sp.slice(1));
      if (s && (s.length > 2 || Math.max.apply(null, s.map(function(x) { return x.length; }).concat([0])) > 1)) f.unshift(kind(s, lang, t.stipulation));
    }
    if (t.block) f.push(lab('block', t.block[0], lang));
    if (t.round) f.push(String(lab('round', t.round[0], lang)).replace(/ match$/i, ''));
    return f;
  }
  // For the StarScope page (2.63.0): ratings, and what the filters are built from.
  var rate = {};
  viRows('ratings').forEach(function(r) { if (Number(r.stars) >= 1) { var o = rate[r.match_id] = rate[r.match_id] || { s: 0, n: 0 }; o.s += Number(r.stars); o.n++; } });
  var tmn = {}, fcn = {};
  viRows('teams').forEach(function(x) { tmn[x.team_id] = x.name_en; });
  viRows('factions').forEach(function(x) { fcn[x.faction_id] = x.name_en; });
  // For the StarScope player (2.65.0): the show's name and venue for the video page's title.
  var shw = {}, ven = {};
  viRows('venues').forEach(function(x) { ven[x.venue_id] = { en: x.name_en, ja: x.name_ja || x.name_en }; });
  viRows('shows').forEach(function(x) { shw[x.show_id] = { n: x.name, v: ven[x.venue_id] || null }; });
  var map = {};
  viRows('match_videos').forEach(function(v) {
    var m = m2[v.match_id], p = parts[v.match_id];
    if (!m || !p || !p.length) return;
    var t = tags[v.match_id] || {}, en = sideList(p, 'en'), ja = sideList(p, 'ja');
    var sizes = en.map(function(x) { return x.length; }), rt = rate[v.match_id], groups = {};
    p.forEach(function(x) { if (tmn[x.team_id]) groups[tmn[x.team_id]] = 1; if (fcn[x.faction_id]) groups[fcn[x.faction_id]] = 1; });
    var extra = {
      u: String(m.updated || ''),
      k: en.length > 2 ? 'multi' : (Math.max.apply(null, sizes) <= 1 ? 'singles' : 'tag'),
      c: t.competition ? lab('competition', t.competition[0], 'en') : '',
      ti: (t.title || []).map(function(x) { return lab('title', x, 'en'); }),
      g: Object.keys(groups),
      r: rt ? Math.round(rt.s / rt.n * 10) / 10 : 0, rc: rt ? rt.n : 0,
      // For the StarScope Shows page (2.66.0): the match, its round and the special rules, to pick a show's highlights.
      m: String(v.match_id), rd: t.round || [], st: (t.stipulation || []).filter(function(x) { return !/^(gauntlet|royal|rumble|handicap)$/.test(x) && (t.title || []).indexOf(x) < 0; }),
      dk: String(m.is_dark).toUpperCase() === 'TRUE'
    };
    map[v.video_id] = { x: extra, s: en, sj: ja, e: event(m, t, en, 'en'), ej: event(m, t, ja, 'ja'), f: foot(t, 'en', en), fj: foot(t, 'ja', ja), tn: big(en, t.stipulation) ? teamNames(p, 'en') : null, tnj: big(en, t.stipulation) ? teamNames(p, 'ja') : null, n: m.card_no, t: m.card_total, d: m.date, sid: String(m.show_id || ''), sh: (shw[m.show_id] || {}).n || '', vn: ((shw[m.show_id] || {}).v || {}).en || '', vnj: ((shw[m.show_id] || {}).v || {}).ja || '', bl: v.bell_sec === '' ? '' : Number(v.bell_sec), ed: v.end_sec === '' ? '' : Number(v.end_sec), th: (seen[String(v.video_id)] || {}).th || '', p: people(p, (seen[String(v.video_id)] || {}).text || '') };
  });
  return { ok: true, map: map };
}

// StarScope Log next (2.67.0): every video the private build has read ("videos") that has no match_videos row, grouped
// by its set (the show). Read only, no lock. Zero-time (dark) matches and backstage comment clips are marked, so the app
// can leave them out of the ranking. The venue is matched to the venues tab by its Japanese name where it can be.
function viSuggest() {
  var logged = {};
  viRows('match_videos').forEach(function(v) { logged[String(v.video_id)] = 1; });
  var ven = viRows('venues').filter(function(x) { return x.name_ja; });
  function venue(raw) {
    raw = String(raw || '');
    if (!raw) return null;
    var hit = ven.filter(function(x) { return raw.indexOf(x.name_ja) >= 0; })[0];
    return hit ? { id: hit.venue_id, en: hit.name_en, ja: hit.name_ja } : null;
  }
  var sh = sheet(), n = sh.getLastRow(), sets = {};
  if (n < 2) return { ok: true, sets: [] };
  var I = {}; ['id', 'last_seen', 'times_seen', 'no', 'title_en', 'title_ja', 'show', 'show_date', 'venue', 'set_id', 'thumb'].forEach(function(c) { I[c] = COLS.indexOf(c); });
  sh.getRange(2, 1, n - 1, COLS.length).getValues().forEach(function(r) {
    var id = String(r[I.id]), set = String(r[I.set_id] || '');
    if (!id || !set || logged[id]) return;
    var t = [r[I.title_en], r[I.title_ja]].join(' '), no = r[I.no] === '' ? null : Number(r[I.no]);
    var g = sets[set] = sets[set] || { set: set, show: '', dates: {}, venueRaw: '', videos: [] };
    if (r[I.show]) g.show = String(r[I.show]);
    if (r[I.show_date]) { var d = String(r[I.show_date] instanceof Date ? Utilities.formatDate(r[I.show_date], 'UTC', 'yyyy-MM-dd') : r[I.show_date]).slice(0, 10); g.dates[d] = (g.dates[d] || 0) + 1; }
    if (r[I.venue]) g.venueRaw = String(r[I.venue]);
    g.videos.push({ id: id, no: isFinite(no) ? no : null, views: Number(r[I.times_seen]) || 1, last: r[I.last_seen] instanceof Date ? r[I.last_seen].toISOString() : String(r[I.last_seen] || ''), th: String(r[I.thumb] || ''),
      zero: no === 0 || /ダイゼロ|ゼロタイム|zero\s*-?\s*time|第0試合/i.test(t), comment: /コメント|comments?\b/i.test(t) && !/試合|マッチ|match|commentary/i.test(t) });
  });
  var out = Object.keys(sets).map(function(k) {
    var g = sets[k], date = Object.keys(g.dates).sort(function(a, b) { return g.dates[b] - g.dates[a]; })[0] || '';
    return { set: g.set, show: g.show, date: date, venueRaw: g.venueRaw, venue: venue(g.venueRaw), videos: g.videos };
  });
  return { ok: true, sets: out };
}

// The compiled index. Ids and tags only, so it can go to public builds later. Results are a separate block, hidden unless asked for.
function viExport() {
  var parts = {}, vids = {}, tags = {};
  viRows('participants').forEach(function(p) { (parts[p.match_id] = parts[p.match_id] || []).push(p); });
  viRows('match_videos').forEach(function(v) { (vids[v.match_id] = vids[v.match_id] || []).push([Number(v.video_id), v.version]); });
  // Anything that gives away the ending stays with the results.
  var spoil = {};
  viRows('match_tags').forEach(function(t) {
    var hide = t.tag_group === 'finish' || t.tag_group === 'fall' || t.tag_value === 'title-change' || t.tag_value === 'first-title';
    var box = hide ? spoil : tags, o = box[t.match_id] = box[t.match_id] || {};
    (o[t.tag_group] = o[t.tag_group] || []).push(t.tag_value);
  });
  var matches = [], results = {};
  viRows('matches').forEach(function(m) {
    if (m.merged_into || !(Number(m.level) >= 1) || !parts[m.match_id]) return;
    var sides = [];
    parts[m.match_id].slice().sort(function(a, b) { return (a.side_no - b.side_no) || (a.slot - b.slot); }).forEach(function(p) { (sides[p.side_no - 1] = sides[p.side_no - 1] || []).push(p.talent_id || null); });
    matches.push({ id: m.match_id, d: m.date, show: m.show_id, no: m.card_no === '' ? null : Number(m.card_no), dark: String(m.is_dark).toUpperCase() === 'TRUE', sides: sides.filter(Boolean), videos: vids[m.match_id] || [], tags: tags[m.match_id] || {}, level: Number(m.level) });
    if (m.result_type || spoil[m.match_id]) results[m.match_id] = { type: m.result_type || null, side: m.winner_side === '' ? null : Number(m.winner_side), tags: spoil[m.match_id] || {} };
  });
  return { ok: true, schema: 1, at: new Date().toISOString(), matches: matches, results: results };
}


// ---- StarScope on the phone (2.68.0) ---------------------------------------------------------------------------------
// The TV (private build, assets/scopelink.js) sends a note each time playback changes: play, pause, seek, buffering,
// speed, and when a video page opens or closes. Each note has the TV's clock time and the video position, so a tap on the
// phone (its own clock time) can be turned into a place in the video: the last note before the tap, plus the time since.
var PB_SHEET = 'playback';
var PB_COLS = ['ts', 'video', 'set', 'ev', 'pos', 'playing', 'rate', 'device', 'info', 'received'];
var PB_EVENTS = /^(open|play|pause|seek|buffer|resume|rate|sync|end|stop)$/;

function pbSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(PB_SHEET);
  if (!sh) { sh = ss.insertSheet(PB_SHEET); sh.appendRow(PB_COLS); sh.setFrozenRows(1); }
  return sh;
}
function pbRows() {
  var sh = pbSheet(), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, PB_COLS.length).getValues().map(function(v) {
    var o = {}; PB_COLS.forEach(function(c, i) { o[c] = v[i]; }); return o;
  });
}

function pbPut(b) {
  var video = String(b.video || ''), set = /^\d{1,9}$/.test(String(b.set || '')) ? String(b.set) : '';
  if (!/^\d{1,9}$/.test(video)) return { ok: false, error: 'bad video' };
  if (!Array.isArray(b.events) || !b.events.length || b.events.length > 60) return { ok: false, error: 'bad events' };
  var now = new Date().toISOString(), device = String(b.device || '').slice(0, 40);
  var info = b.info && typeof b.info === 'object' ? JSON.stringify(b.info).slice(0, 2000) : '';
  var add = [];
  b.events.forEach(function(e, i) {
    var ts = Number(e && e.ts), pos = Number(e && e.pos), rate = Number(e && e.rate) || 1;
    if (!(ts > 1.5e12 && ts < 4e12) || !(pos >= 0 && pos < 86400) || !PB_EVENTS.test(String(e.ev))) return;
    add.push({ ts: ts, video: video, set: set, ev: e.ev, pos: Math.round(pos * 100) / 100, playing: e.playing ? 1 : 0,
      rate: rate > 0 && rate <= 4 ? rate : 1, device: device, info: i === 0 ? info : '', received: now });
  });
  if (!add.length) return { ok: false, error: 'no good events' };
  var rows = pbRows().concat(add);
  // Only the video now playing and the one before it are kept, so a late tap on the last match still finds its place.
  var order = [];
  rows.slice().sort(function(x, y) { return y.ts - x.ts; }).forEach(function(r) { var v = String(r.video); if (order.indexOf(v) < 0) order.push(v); });
  var keep = order.slice(0, 2);
  var kept = rows.filter(function(r) { return keep.indexOf(String(r.video)) >= 0; });
  // A long session on one video: the oldest notes go once there are 400 (the newest note before a tap is what counts).
  kept.sort(function(x, y) { return x.ts - y.ts; });
  if (kept.length > 400) kept = kept.slice(kept.length - 400);
  var sh = pbSheet(), old = sh.getLastRow();
  if (kept.length === rows.length) {
    sh.getRange(old + 1, 1, add.length, PB_COLS.length).setValues(add.map(function(r) { return PB_COLS.map(function(c) { return r[c]; }); }));
  } else {
    if (old > 1) sh.getRange(2, 1, old - 1, PB_COLS.length).clearContent();
    sh.getRange(2, 1, kept.length, PB_COLS.length).setValues(kept.map(function(r) { return PB_COLS.map(function(c) { return r[c]; }); }));
  }
  return { ok: true, added: add.length, wiped: rows.length - kept.length };
}

// The page's own calls (google.script.run). Each needs the key the page was opened with.
function phoneKey_(k) {
  var key = PropertiesService.getScriptProperties().getProperty('KEY');
  if (!key || k !== key) throw new Error('bad key');
}
// The TV the notes come from: its device name is used for the star rating, so the phone and that TV share one.
function phoneDevice_(rows) {
  for (var i = rows.length - 1; i >= 0; i--) if (rows[i].device) return String(rows[i].device);
  return 'phone';
}

// What the TV is playing: its notes for the current and the last video, and what the page said about each video.
function phoneNow(k) {
  phoneKey_(k);
  var rows = pbRows().sort(function(x, y) { return x.ts - y.ts; }), vids = [];
  rows.forEach(function(r) { var v = String(r.video); var i = vids.indexOf(v); if (i >= 0) vids.splice(i, 1); vids.push(v); });
  vids = vids.slice(-2).reverse();
  var res = { ok: true, now: Date.now(), device: phoneDevice_(rows), videos: [] };
  vids.forEach(function(v) {
    var mine = rows.filter(function(r) { return String(r.video) === v; }), info = {};
    mine.forEach(function(r) { if (r.info) { try { info = JSON.parse(r.info); } catch (e) {} } });
    res.videos.push({ video: v, set: String(mine[0].set || ''), info: info, rec: phoneRec_(v),
      events: mine.map(function(r) { return [Number(r.ts), String(r.ev), Number(r.pos), Number(r.playing) ? 1 : 0, Number(r.rate) || 1]; }) });
  });
  return res;
}
// The video's page facts from the videos tab (what the TV read: title, line-up, show, date, version).
function phoneRec_(video) {
  var sh = sheet(), n = sh.getLastRow();
  if (n < 2) return null;
  var hit = sh.getRange(2, 1, n - 1, 1).createTextFinder(String(video)).matchEntireCell(true).findNext();
  if (!hit) return null;
  var raw = sh.getRange(hit.getRow(), COLS.indexOf('rec') + 1).getValue();
  try { return JSON.parse(raw); } catch (e) { return null; }
}
function phoneLib(k) {
  phoneKey_(k);
  var r = withLock(function() { return viAction({ action: 'vi_lib' }); });
  return r;
}
function phoneGet(k, video, show) {
  phoneKey_(k);
  return viGet({ video: String(video || ''), show: String(show || ''), device: phoneDevice_(pbRows().sort(function(x, y) { return x.ts - y.ts; })) });
}
function phoneSave(k, body) {
  phoneKey_(k);
  body = body || {};
  body.action = 'vi_save';
  body.device = phoneDevice_(pbRows().sort(function(x, y) { return x.ts - y.ts; }));
  return withLock(function() { return viSave(body); });
}
function phonePropose(k, body) {
  phoneKey_(k);
  body = body || {};
  body.action = 'vi_propose';
  body.owner = true;     // the owner's phone, like the private build: the addition goes in at once
  body.device = 'phone';
  return withLock(function() { return viAction(body); });
}
