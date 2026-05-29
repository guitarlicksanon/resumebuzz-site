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
    '.buzz-judge{position:fixed;width:52px;z-index:9999;pointer-events:none;' +
    'transform-origin:50% 80%;filter:drop-shadow(0 3px 6px rgba(31,30,20,.3))}';
  document.head.appendChild(style);

  // The actual Buzz sprite from the "Get Buzz a Job" game (bee.html beeSVG):
  // square glasses, antennae, stinger. Here: wings resting, frowning, eyes
  // cut hard to the side. Not the Associate, not the phone-glued Apprentice.
  var _uid = 0;
  function buzzSVG() {
    var u = 'bz' + (_uid++);
    return '<svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;width:100%;height:auto;display:block">' +
      '<ellipse cx="22" cy="58" rx="22" ry="13" fill="rgba(255,255,255,0.75)" stroke="rgba(200,200,200,0.4)" stroke-width="0.8" style="transform:rotate(-26deg);transform-box:fill-box;transform-origin:right center"/>' +
      '<ellipse cx="78" cy="58" rx="22" ry="13" fill="rgba(255,255,255,0.75)" stroke="rgba(200,200,200,0.4)" stroke-width="0.8" style="transform:rotate(26deg);transform-box:fill-box;transform-origin:left center"/>' +
      '<clipPath id="' + u + '"><ellipse cx="50" cy="95" rx="21" ry="30"/></clipPath>' +
      '<ellipse cx="50" cy="95" rx="21" ry="30" fill="#F5C800"/>' +
      '<rect x="29" y="83" width="42" height="10" fill="#111" clip-path="url(#' + u + ')"/>' +
      '<rect x="29" y="101" width="42" height="10" fill="#111" clip-path="url(#' + u + ')"/>' +
      '<polygon points="46,124 54,124 50,130" fill="#E8A838"/>' +
      '<circle cx="50" cy="44" r="30" fill="#F5C800"/>' +
      // eyes: pupils + highlights shifted left = side-eye
      '<circle cx="36" cy="44" r="11" fill="#fff"/><circle cx="31" cy="44" r="5.5" fill="#111"/><circle cx="28" cy="41" r="2" fill="#fff"/>' +
      '<circle cx="64" cy="44" r="11" fill="#fff"/><circle cx="59" cy="44" r="5.5" fill="#111"/><circle cx="56" cy="41" r="2" fill="#fff"/>' +
      // Buzz's signature square glasses
      '<rect x="23" y="31" width="26" height="22" rx="4" fill="none" stroke="#111" stroke-width="3.5"/>' +
      '<rect x="51" y="31" width="26" height="22" rx="4" fill="none" stroke="#111" stroke-width="3.5"/>' +
      '<line x1="49" y1="42" x2="51" y2="42" stroke="#111" stroke-width="3.5"/>' +
      '<line x1="23" y1="42" x2="16" y2="44" stroke="#111" stroke-width="3"/>' +
      '<line x1="77" y1="42" x2="84" y2="44" stroke="#111" stroke-width="3"/>' +
      '<path d="M38 62 Q50 56 62 62" stroke="#111" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
      '<line x1="38" y1="16" x2="30" y2="4" stroke="#111" stroke-width="2.5"/><circle cx="29" cy="3" r="3.5" fill="#111"/>' +
      '<line x1="62" y1="16" x2="70" y2="4" stroke="#111" stroke-width="2.5"/><circle cx="71" cy="3" r="3.5" fill="#111"/>' +
      '</svg>';
  }

  function judge(field) {
    var prev = field._buzzBee;
    if (prev) { clearTimeout(prev._t); prev.remove(); }
    var b = document.createElement('div');
    b.className = 'buzz-judge';
    b.innerHTML = buzzSVG();
    var r = field.getBoundingClientRect();
    b.style.left = (r.right - 56) + 'px';
    b.style.top = (r.top - 46) + 'px';
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
