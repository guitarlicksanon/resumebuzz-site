/* Buzz's side-eye.
   Buzz quietly watches what you type in the builder. Write a resume cliche
   and a frowning, side-eyeing bee peeks out of the field, shakes its head
   once, and leaves. The look IS the message: no popup, no lecture. Buzz is
   doing the job the theme song promises. Self-contained. */
(function () {
  // Fields Buzz watches: free-text the USER authors. Skip the pasted job
  // description (that's the employer's words, not yours).
  var SKIP = { jobDescription: 1 };
  var fields = [].slice.call(document.querySelectorAll('textarea, input[type="text"]'))
    .filter(function (el) { return !SKIP[el.id]; });
  if (!fields.length) return;

  // Tight, unambiguous resume cliches. Left out legit-use words (passionate,
  // dynamic, proactive) on purpose to avoid false side-eyes.
  var PARTS = [
    'synerg(?:y|ize|istic)', 'rock\\s?star', 'ninja', 'guru', 'go[\\s-]getter',
    'team player', 'hard[\\s-]?work(?:er|ing)', 'results[\\s-]driven',
    'detail[\\s-]oriented', 'self[\\s-]starter', 'think outside the box',
    'outside the box', 'hit the ground running', 'wear(?:ing)? many hats',
    '(?:go )?above and beyond', 'game[\\s-]changer', 'thought leader',
    'move the needle', 'low[\\s-]hanging fruit', 'circle back', 'best[\\s-]of[\\s-]breed'
  ];
  function freshRe() { return new RegExp('\\b(' + PARTS.join('|') + ')\\b', 'gi'); }
  function clichesIn(text) {
    var m, out = {}, re = freshRe();
    while ((m = re.exec(text)) !== null) out[m[0].toLowerCase().replace(/[\s-]+/g, ' ')] = 1;
    return out;
  }

  var style = document.createElement('style');
  style.textContent =
    '.buzz-judge{position:fixed;width:46px;z-index:9999;pointer-events:none;' +
    'transform-origin:50% 80%;filter:drop-shadow(0 3px 6px rgba(31,30,20,.3))}';
  document.head.appendChild(style);

  // The real Buzz palette (#F5C800 / #111), frowning with eyes cut to the side.
  var BEE =
    '<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">' +
    '<line x1="40" y1="18" x2="34" y2="6" stroke="#111" stroke-width="2.5" stroke-linecap="round"/>' +
    '<circle cx="33" cy="5" r="3.2" fill="#111"/>' +
    '<line x1="60" y1="18" x2="66" y2="6" stroke="#111" stroke-width="2.5" stroke-linecap="round"/>' +
    '<circle cx="67" cy="5" r="3.2" fill="#111"/>' +
    '<circle cx="50" cy="44" r="30" fill="#F5C800"/>' +
    '<circle cx="36" cy="44" r="11" fill="#fff"/><circle cx="64" cy="44" r="11" fill="#fff"/>' +
    '<circle cx="41" cy="42" r="5.5" fill="#111"/><circle cx="69" cy="42" r="5.5" fill="#111"/>' +
    '<circle cx="39" cy="40" r="1.6" fill="#fff"/><circle cx="67" cy="40" r="1.6" fill="#fff"/>' +
    '<path d="M 40 62 Q 50 56 60 62" stroke="#111" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '</svg>';

  function judge(field) {
    var prev = field._buzzBee;
    if (prev) { clearTimeout(prev._t); prev.remove(); }
    var b = document.createElement('div');
    b.className = 'buzz-judge';
    b.innerHTML = BEE;
    var r = field.getBoundingClientRect();
    b.style.left = (r.right - 52) + 'px';
    b.style.top = (r.top - 22) + 'px';
    document.body.appendChild(b);
    field._buzzBee = b;
    var dur = 2000;
    b.animate([
      { opacity: 0, transform: 'translateY(4px) rotate(0deg)' },
      { opacity: 1, transform: 'translateY(0px) rotate(-9deg)', offset: .2 },
      { opacity: 1, transform: 'translateY(0px) rotate(9deg)', offset: .42 },
      { opacity: 1, transform: 'translateY(0px) rotate(-7deg)', offset: .62 },
      { opacity: 1, transform: 'translateY(0px) rotate(0deg)', offset: .82 },
      { opacity: 0, transform: 'translateY(-3px) rotate(0deg)' }
    ], { duration: dur, easing: 'ease-in-out' });
    b._t = setTimeout(function () { if (field._buzzBee === b) field._buzzBee = null; b.remove(); }, dur + 60);
  }

  fields.forEach(function (field) {
    // Seed with cliches already present so loading a saved resume is silent.
    // Buzz only reacts to ones you newly type.
    field._buzzSeen = clichesIn(field.value || '');
    var t;
    field.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var now = clichesIn(field.value || '');
        var fresh = false;
        for (var k in now) { if (!field._buzzSeen[k]) { fresh = true; break; } }
        field._buzzSeen = now;
        if (fresh) judge(field);
      }, 450);
    });
  });
})();
