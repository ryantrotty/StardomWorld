(function(){
  if (window.__tvSetOrder) return;
  // The site lists a set's matches in two different ways: Nighter-style shows run in show order,
  // while PPV-style shows put the main event first and the opener last (video IDs go either way,
  // so they are no help). This looks at the titles to tell which, and says whether the list has
  // to be turned around to get show order.
  var OPENER = /ダイゼロ|ゼロタイム|zero\s*-?\s*time/i;
  var HEAD = /選手権|優勝決定|王座|ワールド・オブ|title\s+match|championship|final/i;

  function needsFlip(titles) {
    var t = (titles || []).filter(function(x){ return x && x.trim(); });
    if (t.length < 2) return false;
    var first = t[0], last = t[t.length - 1];
    if (OPENER.test(last) && !OPENER.test(first)) return true;
    if (OPENER.test(first) && !OPENER.test(last)) return false;
    var hf = HEAD.test(first), hl = HEAD.test(last);
    if (hf && !hl) return true;
    return false;
  }

  window.__tvSetOrder = { needsFlip: needsFlip };
})();
