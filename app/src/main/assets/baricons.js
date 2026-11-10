(function(){
  // Icons for the video control bars (the bar under the picture and the PPV bar). The app decides what each button
  // shows (AndroidHost.barIcons: k = icon, t = number or badge, on = filled, off = not available); this draws it.
  // The full screen bar draws the same shapes natively (BarIconDrawable in MainActivity.kt): change both together.
  if (window.__tvBarSvg) return;
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  var S = 'stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"';
  function text(x, y, size, t, anchor, fill) {
    return '<text x="' + x + '" y="' + y + '" text-anchor="' + (anchor || 'middle') + '" font-size="' + size + '" font-weight="800" font-family="Arial,Helvetica,sans-serif" fill="' + (fill || 'currentColor') + '">' + esc(t) + '</text>';
  }
  function gear() {
    var h = '<circle cx="12" cy="12" r="3" ' + S + ' stroke-width="1.9"/><circle cx="12" cy="12" r="6.5" ' + S + ' stroke-width="1.9"/>';
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
      h += '<path d="M' + (12 + 6.5 * c).toFixed(2) + ' ' + (12 + 6.5 * s).toFixed(2) + 'L' + (12 + 9 * c).toFixed(2) + ' ' + (12 + 9 * s).toFixed(2) + '" stroke="currentColor" stroke-width="2.6"/>';
    }
    return h;
  }
  var SHAPES = {
    prev: function() { return '<path d="M6 5v14" ' + S + ' stroke-width="2.4"/><path d="M18.5 5.5L9 12l9.5 6.5z" fill="currentColor"/>'; },
    next: function() { return '<path d="M18 5v14" ' + S + ' stroke-width="2.4"/><path d="M5.5 5.5L15 12l-9.5 6.5z" fill="currentColor"/>'; },
    play: function() { return '<path d="M7 4.5L19.5 12 7 19.5z" fill="currentColor"/>'; },
    pause: function() { return '<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/>'; },
    back: function(t) { return '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" ' + S + ' stroke-width="2"/><path d="M4 3.5V8h4.5" ' + S + ' stroke-width="2"/>' + text(12, 15.3, String(t).length > 2 ? 6.3 : 7.5, t); },
    fwd: function(t) { return '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" ' + S + ' stroke-width="2"/><path d="M20 3.5V8h-4.5" ' + S + ' stroke-width="2"/>' + text(12, 15.3, String(t).length > 2 ? 6.3 : 7.5, t); },
    mute: function() { return '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" ' + S + ' stroke-width="2"/>'; },
    muted: function() { return '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" ' + S + ' stroke-width="2"/>'; },
    cc: function(t, on) {
      return '<rect x="3" y="5.5" width="18" height="13" rx="2.5" stroke="currentColor" stroke-width="2" fill="' + (on ? 'currentColor' : 'none') + '"/>' + text(12, 14.8, 6.8, t, 'middle', on ? '#0B1118' : 'currentColor');
    },
    gear: gear,
    speed: function() { return '<path d="M4 17a8 8 0 1 1 16 0" ' + S + ' stroke-width="2"/><path d="M12 17l4-5" ' + S + ' stroke-width="2.2"/><circle cx="12" cy="17" r="1.7" fill="currentColor"/>'; },
    full: function() { return '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" ' + S + ' stroke-width="2.3"/>'; },
    exit: function() { return '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" ' + S + ' stroke-width="2.3"/>'; }
  };
  // Badges (quality, speed) sit at the top right, inside the icon's own box, so the button never changes size.
  var BADGE = { gear: 1, speed: 1 };
  window.__tvBarSvg = function(spec, px) {
    var f = SHAPES[spec && spec.k];
    if (!f) return '';
    var body = f(spec.t || '', !!spec.on);
    if (BADGE[spec.k] && spec.t) body += text(26, 5, 7.5, spec.t, 'end');
    return '<svg width="' + (px || 28) + '" height="' + (px || 28) + '" viewBox="-2 -2 28 28" aria-hidden="true">' + body + '</svg>';
  };
})();
