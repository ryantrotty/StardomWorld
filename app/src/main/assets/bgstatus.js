(function(){
  // Background activity pill (2.124.0). A small status pill in the top right while the app fetches or saves something
  // out of sight: the schedule, roster and titles check, the StarScope list, and saves to the private sheet. The app keeps
  // the running tasks (MainActivity bgBegin / bgEnd), so a task started on one page still shows on the next one.
  // Not focusable and never takes a key. Hidden while a video plays, in full screen, and under the reminder toast.
  if (window.__tvBgStatus) return;
  var H = window.AndroidHost;
  if (!H || !H.bgStatusJson) return;
  window.__tvBgStatus = true;
  var ja = document.cookie.indexOf('googtrans=/ja/ja') !== -1;
  var S = null, el = null;
  // How long a finished task stays up: news (something changed) longest, a failure longer still, "up to date" briefly.
  var SHOW_CHANGED = 10000, SHOW_FAIL = 15000, SHOW_OK = 4000;
  var TELE = '<svg width="16" height="16" viewBox="0 -13 60 60" aria-hidden="true"><g transform="rotate(-32 24 20)"><rect x="9" y="15" width="24" height="10" rx="1.5" fill="currentColor"/><rect x="3" y="17.5" width="6" height="5" rx="1" fill="currentColor"/><path d="M33 12.5H40V27.5H33Z" fill="currentColor"/></g><path d="M23 25L14 45M25 25L34 45M24 25V44" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/></svg>';
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function hm(ms) { var d = new Date(ms); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }

  function css() {
    if (document.getElementById('tv-bg-css')) return;
    var st = document.createElement('style');
    st.id = 'tv-bg-css';
    st.textContent = [
      '#tv-bg{position:fixed;top:18px;right:24px;z-index:99400;display:none;align-items:center;gap:8px;max-width:520px;box-sizing:border-box;padding:7px 14px;border-radius:20px;background:#11171E;border:1px solid #2A323C;font:700 14px Arial,Helvetica,sans-serif;color:#C9D2DC;pointer-events:none;opacity:0;transition:opacity .25s;}',
      '#tv-bg.on{display:flex;}',
      '#tv-bg.vis{opacity:1;}',
      '#tv-bg .ic{flex:none;display:flex;color:#F4C242;}',
      '#tv-bg .tx{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '#tv-bg .tm{flex:none;color:#9AA6B4;font-weight:600;}',
      '#tv-bg.run{color:#FFFFFF;}',
      '#tv-bg.run .ic{animation:tvbgp 1.2s ease-in-out infinite;}',
      '#tv-bg.new{border-color:#F4C242;}',
      '#tv-bg.bad{border-color:#FF7A66;}',
      '#tv-bg.bad .ic{color:#FF7A66;}',
      '@keyframes tvbgp{0%,100%{opacity:1}50%{opacity:.35}}'
    ].join('');
    (document.head || document.documentElement).appendChild(st);
  }

  // Out of the way: a playing video, full screen, or the reminder toast (same corner).
  function blocked() {
    if (document.fullscreenElement || document.webkitFullscreenElement) return true;
    var vs = document.getElementsByTagName('video');
    for (var i = 0; i < vs.length; i++) if (!vs[i].paused && !vs[i].ended && vs[i].readyState > 2) return true;
    var t = document.getElementById('tv-rem-toast');
    if (t && t.offsetParent !== null) return true;
    return false;
  }
  // Below the PAGE chip when a long list shows it.
  function top() {
    var c = document.getElementById('tv-pg-chip');
    if (c && c.style.display !== 'none' && c.offsetParent !== null) { var r = c.getBoundingClientRect(); return Math.round(r.bottom + 8) + 'px'; }
    return '18px';
  }

  function paint() {
    if (!document.body) return;
    if (!el) {
      css();
      el = document.createElement('div');
      el.id = 'tv-bg';
      el.className = 'notranslate';
      el.setAttribute('translate', 'no');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    var run = (S && S.run) || [], last = S && S.last, now = Date.now(), html = '', cls = '';
    if (run.length) {
      var t = run[run.length - 1];
      html = '<span class="ic">' + TELE + '</span><span class="tx">' + esc(ja ? t.ja : t.en) + (run.length > 1 ? ' +' + (run.length - 1) : '') + '…</span>';
      cls = 'run';
    } else if (last && last.at) {
      var keep = last.ok === false ? SHOW_FAIL : last.changed ? SHOW_CHANGED : SHOW_OK;
      if (now - last.at < keep) {
        html = '<span class="ic">' + (last.ok === false ? '!' : TELE) + '</span><span class="tx">' + esc(ja ? last.ja : last.en) + '</span><span class="tm">' + hm(last.at) + '</span>';
        cls = last.ok === false ? 'bad' : last.changed ? 'new' : '';
      }
    }
    if (!html || blocked()) {
      el.classList.remove('vis');
      if (el.classList.contains('on')) setTimeout(function() { if (!el.classList.contains('vis')) el.classList.remove('on'); }, 260);
      return;
    }
    if (el.getAttribute('data-h') !== html) { el.innerHTML = html; el.setAttribute('data-h', html); }
    var was = el.classList.contains('vis');
    el.className = 'notranslate on ' + cls + (was ? ' vis' : '');
    el.style.top = top();
    if (!was) { void el.offsetWidth; el.classList.add('vis'); }
  }

  // Pushed by the app on every change, and read once now (a task may already be running from the last page).
  window.__tvBgSet = function(txt) { try { S = JSON.parse(txt); } catch (e) { return; } paint(); };
  try { S = JSON.parse(H.bgStatusJson()); } catch (e) { S = null; }
  // Once a second: expire finished tasks and follow video, full screen and the PAGE chip. Cheap, and paused with the page.
  if (document.body) paint(); else document.addEventListener('DOMContentLoaded', paint);
  setInterval(paint, 1000);
})();
