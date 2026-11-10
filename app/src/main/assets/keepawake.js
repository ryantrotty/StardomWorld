(function(){
  // Keeps the screen on only while something is playing, so Google TV's own ambient mode can start when the app sits idle.
  // Every 10 seconds of playback it tells the app; the app lets the screen sleep 30 seconds after the last word.
  if (window.__tvKeepAwake) return;
  window.__tvKeepAwake = true;
  var H = window.AndroidHost;
  if (!H || !H.stillPlaying) return;
  var heard = 0;   // the embedded player only sends time updates while it plays
  window.addEventListener('message', function(ev) {
    try {
      var d = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
      if (d && (d.event === 'timeupdate' || d.event === 'playing' || d.event === 'play')) heard = Date.now();
      if (d && (d.event === 'pause' || d.event === 'ended' || d.event === 'finish')) heard = 0;
    } catch (e) {}
  });
  function playing() {
    if (Date.now() - heard < 12000) return true;
    // PPV player pages: the stream can sit in a frame this page cannot see into, so the page itself counts.
    if (/stagecrowd/i.test(location.hostname) && /\/(live_player_test|plan_player|live_player)/.test(location.pathname)) return true;
    var vs = document.querySelectorAll('video');
    for (var i = 0; i < vs.length; i++) { var v = vs[i]; if (!v.paused && !v.ended && v.readyState > 2) return true; }
    return false;
  }
  function tick() { try { if (playing()) H.stillPlaying(); } catch (e) {} }
  ['play', 'playing'].forEach(function(t) { document.addEventListener(t, function() { setTimeout(tick, 500); }, true); });
  setInterval(tick, 10000);
  tick();
})();
