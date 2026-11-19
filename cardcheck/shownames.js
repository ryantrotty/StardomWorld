(function(){
  // English show names (2.78.2). The video site names its shows in Japanese only ("第16回 ゴッデス・オブ・スターダム
  // ～タッグリーグ戦～ in MATSUYAMA-EHIME"), and stripping the Japanese in English mode left things like
  // "16 in MATSUYAMA-EHIME". Now, in this order:
  //   1. the schedule file (the TV already has it): a show on the same date (the city breaks a tie when there are two)
  //      takes the schedule's English name, long ("The 16th Goddesses of Stardom Tag League Tournament in
  //      Matsuyama-Ehime") or short ("Tag League Matsuyama-Ehime");
  //   2. otherwise the usual Japanese words are turned into English (第16回 → 16th, ゴッデス・オブ・スターダム → Goddesses
  //      of Stardom, ...) and what is still Japanese is left out. The roster file's "showWords" adds or changes words.
  //   window.__tvShowName.en(name, date, short)   date YYYY-MM-DD (the show's); short true for the short schedule name
  // Japanese mode keeps the site's name. No requests.
  if (window.__tvShowName) return;
  var H = window.AndroidHost;
  function ja() { return document.cookie.indexOf('googtrans=/ja/ja') !== -1; }
  var WORDS = {
    'ゴッデス・オブ・スターダム': 'Goddesses of Stardom', 'ゴッデスオブスターダム': 'Goddesses of Stardom',
    'ワールド・オブ・スターダム': 'World of Stardom', 'ワンダー・オブ・スターダム': 'Wonder of Stardom',
    'シンデレラ・トーナメント': 'Cinderella Tournament', 'シンデレラトーナメント': 'Cinderella Tournament',
    'タッグリーグ戦': 'Tag League', 'タッグリーグ': 'Tag League', 'リーグ戦': 'League',
    'レッドスターズ': 'Red Stars', 'ブルースターズ': 'Blue Stars', 'レッドゴッデス': 'Red Goddess', 'ブルーゴッデス': 'Blue Goddess',
    'ニューイヤー・スターズ': 'New Year Stars', 'ニューイヤースターズ': 'New Year Stars',
    'オールスター・グランドクイーンダム': 'All Star Grand Queendom', 'スターダム': 'STARDOM',
    '新春': 'New Year', '開幕戦': 'Opening', '最終戦': 'Final', '優勝決定戦': 'Final', '公式戦': 'League Match',
    '後楽園ホール': 'Korakuen Hall', '両国国技館': 'Ryogoku Kokugikan', '横浜武道館': 'Yokohama Budokan', '日本武道館': 'Nippon Budokan',
    '大田区総合体育館': 'Ota Ward Gymnasium', '東京': 'Tokyo', '大阪': 'Osaka', '名古屋': 'Nagoya', '横浜': 'Yokohama', '福岡': 'Fukuoka',
    '札幌': 'Sapporo', '仙台': 'Sendai', '神戸': 'Kobe', '京都': 'Kyoto', '広島': 'Hiroshima', '新潟': 'Niigata', '静岡': 'Shizuoka', '松山': 'Matsuyama'
  };
  try {
    var extra = JSON.parse((H && H.showWordsJson && H.showWordsJson()) || '{}') || {};
    Object.keys(extra).forEach(function(k) { if (k) WORDS[k] = String(extra[k] || ''); });
  } catch (e) {}
  var KEYS = Object.keys(WORDS).sort(function(a, b) { return b.length - a.length; });
  var JP = /[぀-ヿ㐀-鿿ｦ-ﾟ]/;

  var sched = null;
  function events() {
    if (sched) return sched;
    sched = [];
    try {
      var d = JSON.parse((H && H.scheduleJson && H.scheduleJson()) || '{}');
      (d.events || []).forEach(function(e) {
        // the date as it was in Japan (the start keeps its +09:00)
        var m = /^(\d{4}-\d{2}-\d{2})/.exec(e.start || '');
        if (m && e.title) sched.push({ d: m[1], title: String(e.title), short: String(e.short || e.title), hay: (e.id + ' ' + e.title + ' ' + (e.venue || '')).toLowerCase() });
      });
    } catch (e) {}
    return sched;
  }
  function fromSchedule(name, date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
    var same = events().filter(function(e) { return e.d === date; });
    if (same.length <= 1) return same[0] || null;
    // Two shows that day: the one whose city (a Latin word in the site's name, or a translated one) appears in it.
    var words = (local(name).toLowerCase().match(/[a-z]{4,}/g) || []).filter(function(w) { return !/^(stardom|goddesses|league|tournament|match|final|opening)$/.test(w); });
    var hit = same.filter(function(e) { return words.some(function(w) { return e.hay.indexOf(w) >= 0; }); });
    return hit.length === 1 ? hit[0] : null;
  }
  function ordinal(n) {
    var v = n % 100;
    return n + (v >= 11 && v <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
  }
  function local(n) {
    n = String(n || '').replace(/[！-～]/g, function(c) { return String.fromCharCode(c.charCodeAt(0) - 0xfee0); }).replace(/　/g, ' ');
    n = n.replace(/第\s*(\d+)\s*回/g, function(_, d) { return ' ' + ordinal(+d) + ' '; });
    KEYS.forEach(function(k) { if (n.indexOf(k) >= 0) n = n.split(k).join(' ' + WORDS[k] + ' '); });
    // ～Tag League～ → Tag League; a ～...～ part still in Japanese goes
    n = n.replace(/[〜～~]([^〜～~]*)[〜～~]/g, function(_, s) { return JP.test(s) ? ' ' : ' ' + s + ' '; });
    return n.replace(/[　-〿぀-ヿ㐀-鿿＀-￯]+/g, ' ')
      .replace(/\(\s*\)|\[\s*\]/g, ' ').replace(/\s+/g, ' ').replace(/^[\s·\-–:]+|[\s·\-–:]+$/g, '').trim();
  }
  // English match titles (2.103.0). Older videos only have a Japanese title on the site ("6人タッグマッチ",
  // "CMLL日本女子選手権試合"), so card check showed it as it was. The usual match-title words are turned into English
  // (with the show words above for tournaments, blocks and venues); anything the list doesn't know stays as it is.
  // The roster file's "matchWords" adds or changes words. Only shown, never saved.
  //   window.__tvShowName.match(title)
  var MWORDS = {
    '新人ご挨拶': 'Rookie Introduction', 'ご挨拶': 'Greeting', '入団会見': 'Signing Announcement',
    'シングルマッチ': 'Singles Match', 'スペシャルシングルマッチ': 'Special Singles Match', 'タッグマッチ': 'Tag Match',
    'スペシャルタッグマッチ': 'Special Tag Match', 'スペシャル': 'Special', 'ハンディキャップマッチ': 'Handicap Match',
    '時間差バトルロイヤル': 'Staggered-Entry Battle Royal', 'バトルロイヤル': 'Battle Royal', 'ランブル': 'Rumble',
    'ハードコアマッチ': 'Hardcore Match', 'デスマッチ': 'Deathmatch', '金網マッチ': 'Steel Cage Match', 'ラダーマッチ': 'Ladder Match',
    'ランバージャックマッチ': 'Lumberjack Match', 'ノーDQマッチ': 'No DQ Match', 'ストリートファイト': 'Street Fight',
    '敗者髪切りマッチ': 'Loser Gets Head Shaved Match', '髪切りマッチ': 'Hair vs Hair Match', '敗者': 'Loser', 'マスカラ・コントラ・マスカラ': 'Mask vs Mask',
    'エキシビションマッチ': 'Exhibition Match', 'エキシビション': 'Exhibition', 'デビュー戦': 'Debut Match', '引退試合': 'Retirement Match',
    '選手権試合': 'Championship', '選手権': 'Championship', 'タイトルマッチ': 'Title Match', '王座戦': 'Title Match', '王座': 'Title',
    '挑戦者決定戦': 'Number One Contender Match', '次期挑戦者決定戦': 'Number One Contender Match',
    '日本女子': 'Japan Women\'s', 'IWGP女子': 'IWGP Women\'s', 'ハイスピード': 'High Speed', 'フューチャー・オブ・スターダム': 'Future of Stardom',
    'アーティスト・オブ・スターダム': 'Artist of Stardom', 'ストロングウィメンズ': 'Strong Women\'s', 'ゴッデス・オブ・スターダム': 'Goddesses of Stardom',
    'トーナメント': 'Tournament', '準々決勝': 'Quarterfinal', '準決勝': 'Semifinal', '決勝戦': 'Final', '決勝': 'Final',
    '1回戦': 'Round 1', '2回戦': 'Round 2', '3回戦': 'Round 3', '一回戦': 'Round 1', '二回戦': 'Round 2',
    'メインイベント': 'Main Event', 'セミファイナル': 'Semi-Main Event', '試合': 'Match', 'マッチ': 'Match', 'タッグ': 'Tag', 'ブロック': 'Block'
  };
  try {
    var mx = JSON.parse((H && H.matchWordsJson && H.matchWordsJson()) || '{}') || {};
    Object.keys(mx).forEach(function(k) { if (k) MWORDS[k] = String(mx[k] || ''); });
  } catch (e) {}
  // the show words too (tournaments, blocks, venues), the match words winning
  var MALL = {};
  Object.keys(WORDS).forEach(function(k) { MALL[k] = WORDS[k]; });
  Object.keys(MWORDS).forEach(function(k) { MALL[k] = MWORDS[k]; });
  var MKEYS = Object.keys(MALL).sort(function(a, b) { return b.length - a.length; });
  var NUM = { 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 8: 'Eight', 10: 'Ten', 12: 'Twelve' };
  function matchEn(t) {
    var n = String(t || '').replace(/[！-～]/g, function(c) { return String.fromCharCode(c.charCodeAt(0) - 0xfee0); }).replace(/　/g, ' ');
    // 6人タッグマッチ → Six-Woman Tag Match; 3WAYマッチ → 3-Way Match
    n = n.replace(/(\d+)\s*人\s*タッグ\s*(マッチ)?/g, function(_, d) { return ' ' + (NUM[+d] || d) + '-Woman Tag Match '; });
    n = n.replace(/(\d+)\s*WAY\s*(マッチ)?/gi, function(_, d) { return ' ' + d + '-Way Match '; });
    n = n.replace(/第\s*(\d+)\s*試合/g, function(_, d) { return ' Match ' + d + ' '; });
    MKEYS.forEach(function(k) { if (n.indexOf(k) >= 0) n = n.split(k).join(' ' + MALL[k] + ' '); });
    n = n.replace(/[『「]/g, ' \u201c').replace(/[』」]/g, '\u201d ').replace(/・/g, ' ');
    return n.replace(/\s+/g, ' ').replace(/\u201c /g, '\u201c').replace(/ \u201d/g, '\u201d').trim();
  }

  window.__tvShowName = {
    match: function(t) {
      t = String(t || '');
      if (ja() || !JP.test(t)) return t;
      return matchEn(t) || t;
    },
    en: function(name, date, short) {
      name = String(name || '');
      if (ja()) return name;
      var e = fromSchedule(name, date);
      if (e) return short ? e.short : e.title;
      return local(name);
    }
  };
})();
