(function(){
  // StarScope on the phone (2.68.0, private builds with the log address; docs/STARSCOPE_PHONE.md).
  // On a video page, sends the sheet a short note whenever playback changes: the page opening, play, pause, a seek or
  // skip, buffering, a speed change, the end, and leaving the page. Each note has this TV's clock time and the video
  // position, so a Bell or Finish tap on the phone can be turned into a place in the video. Nothing is drawn on the TV,
  // nothing is sent while the video just plays on, and it never talks to the video site.
  if (window.__tvScopeLink) return;
  var M = /^\/(?:set\/([0-9]+)\/)?contents\/([0-9]+)/.exec(location.pathname);
  var H = window.AndroidHost;
  if (!M || !H || !H.scopeLink || !(H.videoIndexOn && H.videoIndexOn())) return;
  window.__tvScopeLink = true;

  var VID = M[2], SET = M[1] || '';
  var WAIT = 1500;        // notes close together (five presses of +30) go as one send
  var DRIFT = 2;          // seconds the player can wander from where the notes say it is before a "sync" note
  var pos = 0, paused = true, buffering = false, rate = 1, queue = [], timer = 0, lastSync = 0, opened = false, seq = 0;

  function playing() { return !paused && !buffering; }
  // Where the notes so far say the video is now.
  var base = { ts: Date.now(), pos: 0, playing: false, rate: 1 };
  function predicted(now) { return base.pos + (base.playing ? (now - base.ts) / 1000 * base.rate : 0); }

  function note(ev, at) {
    var now = Date.now();
    if (typeof at === 'number' && isFinite(at) && at >= 0) pos = at;
    var e = { ts: now, ev: ev, pos: Math.round(pos * 100) / 100, playing: playing(), rate: rate };
    base = { ts: now, pos: e.pos, playing: e.playing, rate: rate };
    queue.push(e);
    clearTimeout(timer);
    timer = setTimeout(flush, ev === 'stop' ? 0 : WAIT);
  }
  function info() {
    var o = {};
    try { var p = window.__tvVixPlace && window.__tvVixPlace(); if (p) o.place = p; } catch (e) {}
    try { var r = window.__tvVixRec; if (r) { o.title = r.title_en || r.title_ja || ''; o.date = r.date || ''; } } catch (e2) {}
    return o;
  }
  function flush() {
    clearTimeout(timer); timer = 0;
    if (!queue.length) return;
    var events = queue.splice(0, 60);
    try { H.scopeLink('p' + (++seq), JSON.stringify({ action: 'pb_put', video: VID, set: SET, events: events, info: info() })); } catch (e) {}
  }
  // Replies are only kept for a look in the console; a lost note is covered by the next one or the drift check.
  window.__tvScopeLinkReply = function(id, text) { window.__tvScopeLinkLast = text; };

  function frame() { return document.querySelector('iframe[src*="vimeo.com"], iframe[src*="player"]'); }
  function post(f, o) { try { f.contentWindow.postMessage(JSON.stringify(o), '*'); } catch (e) {} }
  // The other player scripts already ask for play, pause, timeupdate and buffering; these three are only needed here.
  setInterval(function() {
    var f = frame();
    if (!f) return;
    ['seeked', 'playbackratechange', 'ended'].forEach(function(v) { post(f, { method: 'addEventListener', value: v }); });
  }, 2000);

  window.addEventListener('message', function(m) {
    var d;
    try { d = typeof m.data === 'string' ? JSON.parse(m.data) : m.data; } catch (e) { return; }
    if (!d || !d.event) return;
    var sec = d.data && typeof d.data.seconds === 'number' ? d.data.seconds : null;
    if (d.event === 'timeupdate') {
      if (sec == null) return;
      pos = sec;
      if (!opened) return;
      // Still at the very start and paused (the player loading): nothing to say yet.
      var now = Date.now();
      if (Math.abs(predicted(now) - sec) > DRIFT && now - lastSync > 10000) { lastSync = now; note('sync', sec); }
      return;
    }
    if (d.event === 'play' || d.event === 'playing') { if (!paused) return; paused = false; note('play', sec); }
    else if (d.event === 'pause') { if (paused) return; paused = true; note('pause', sec); }
    else if (d.event === 'seeked') note('seek', sec);
    else if (d.event === 'bufferstart') { if (buffering) return; buffering = true; note('buffer', sec); }
    else if (d.event === 'bufferend') { if (!buffering) return; buffering = false; note('resume', sec); }
    else if (d.event === 'playbackratechange') { var r = d.data && Number(d.data.playbackRate); if (r > 0 && r !== rate) { rate = r; note('rate', sec); } }
    else if (d.event === 'ended' || d.event === 'finish') { paused = true; note('end', sec); }
  });

  // The page opening tells the phone which video is on; once the page has read its facts (title, match number), or
  // after 6 s without them.
  var tries = 0, wait = setInterval(function() {
    if (!window.__tvVixRec && ++tries < 12) return;
    clearInterval(wait);
    opened = true;
    note('open');
  }, 500);

  // Leaving the page (another video, Back, the app closing): the phone shows the TV as stopped.
  function bye() { if (!opened || window.__tvScopeLinkBye) return; window.__tvScopeLinkBye = true; paused = true; note('stop'); flush(); }
  window.addEventListener('pagehide', bye);
  window.addEventListener('beforeunload', bye);
})();
