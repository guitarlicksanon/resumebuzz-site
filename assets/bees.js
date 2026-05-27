(function () {
  var uidCounter = 0;

  /* ── round-eye flying bee (colony bees, unchanged) ─────────────── */
  function makeBuzzSVG(expression) {
    var uid = uidCounter++;
    var mouth = '';
    var eyelidOverlay = '';
    if (expression === 'grin') {
      mouth =
        '<path d="M 33 56 Q 50 72 67 56 Z" fill="white" stroke="#111" stroke-width="2.5"/>' +
        '<line x1="42" y1="56" x2="42" y2="64" stroke="#111" stroke-width="1.5"/>' +
        '<line x1="50" y1="57" x2="50" y2="66" stroke="#111" stroke-width="1.5"/>' +
        '<line x1="58" y1="56" x2="58" y2="64" stroke="#111" stroke-width="1.5"/>';
    } else if (expression === 'frown') {
      mouth = '<path d="M 38 62 Q 50 56 62 62" stroke="#111" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
    } else if (expression === 'sleepy') {
      mouth = '<path d="M 40 59 Q 50 63 60 59" stroke="#111" stroke-width="2" fill="none" stroke-linecap="round"/>';
      eyelidOverlay =
        '<rect x="25" y="31" width="22" height="13" fill="#F5C800" class="bee-eyelid"/>' +
        '<rect x="53" y="31" width="22" height="13" fill="#F5C800" class="bee-eyelid"/>';
    } else {
      mouth = '<path d="M 38 58 Q 50 63 62 58" stroke="#111" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
    }
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 130" style="overflow:visible">' +
      '<ellipse cx="22" cy="58" rx="22" ry="13" fill="rgba(255,255,255,0.75)" stroke="rgba(200,200,200,0.4)" stroke-width="0.8" class="wL" style="transform-box:fill-box;transform-origin:right center;animation:wingFlap 0.13s linear infinite"/>' +
      '<ellipse cx="78" cy="58" rx="22" ry="13" fill="rgba(255,255,255,0.75)" stroke="rgba(200,200,200,0.4)" stroke-width="0.8" class="wR" style="transform-box:fill-box;transform-origin:left center;animation:wingFlapR 0.13s linear infinite"/>' +
      '<clipPath id="bc-' + uid + '"><ellipse cx="50" cy="95" rx="21" ry="30"/></clipPath>' +
      '<ellipse cx="50" cy="95" rx="21" ry="30" fill="#F5C800"/>' +
      '<rect x="29" y="83" width="42" height="10" fill="#111" clip-path="url(#bc-' + uid + ')"/>' +
      '<rect x="29" y="101" width="42" height="10" fill="#111" clip-path="url(#bc-' + uid + ')"/>' +
      '<polygon points="46,124 54,124 50,130" fill="#E8A838"/>' +
      '<rect x="46" y="70" width="8" height="6" rx="1" fill="#555"/>' +
      '<polygon points="44,76 56,76 53,98 50,102 47,98" fill="#666"/>' +
      '<line x1="50" y1="78" x2="50" y2="100" stroke="#F5C800" stroke-width="2.5"/>' +
      '<circle cx="50" cy="44" r="30" fill="#F5C800"/>' +
      '<circle cx="36" cy="44" r="11" fill="white"/>' +
      '<circle cx="36" cy="44" r="5.5" fill="#111"/>' +
      '<circle cx="33" cy="41" r="2" fill="white"/>' +
      '<circle cx="64" cy="44" r="11" fill="white"/>' +
      '<circle cx="64" cy="44" r="5.5" fill="#111"/>' +
      '<circle cx="61" cy="41" r="2" fill="white"/>' +
      eyelidOverlay +
      '<rect x="23" y="31" width="26" height="22" rx="4" fill="none" stroke="#111" stroke-width="3.5"/>' +
      '<rect x="51" y="31" width="26" height="22" rx="4" fill="none" stroke="#111" stroke-width="3.5"/>' +
      '<line x1="49" y1="42" x2="51" y2="42" stroke="#111" stroke-width="3.5"/>' +
      '<line x1="23" y1="42" x2="16" y2="44" stroke="#111" stroke-width="3"/>' +
      '<line x1="77" y1="42" x2="84" y2="44" stroke="#111" stroke-width="3"/>' +
      '<line x1="38" y1="16" x2="30" y2="4" stroke="#111" stroke-width="2.5"/>' +
      '<circle cx="29" cy="3" r="3.5" fill="#111"/>' +
      '<line x1="62" y1="16" x2="70" y2="4" stroke="#111" stroke-width="2.5"/>' +
      '<circle cx="71" cy="3" r="3.5" fill="#111"/>' +
      mouth +
      '</svg>'
    );
  }

  /* ── bored office bee, sits on dropzone corner ─────────────────── */
  function spawnOfficeBee(dz) {
    var uid = uidCounter++;

    var wrap = document.createElement('div');
    wrap.setAttribute('data-bee', 'perch');
    wrap.style.cssText = [
      'position:absolute',
      'top:-70px',
      'right:-18px',
      'width:76px',
      'pointer-events:none',
      'z-index:10',
      'filter:drop-shadow(0 2px 10px rgba(245,200,0,0.25))'
    ].join(';');

    wrap.innerHTML = (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140"' +
      ' style="overflow:visible;display:block;width:100%;height:auto;">' +
      '<defs><clipPath id="ob-' + uid + '"><ellipse cx="50" cy="92" rx="22" ry="18"/></clipPath></defs>' +
      /* folded wings, occasional flutter via JS */
      '<ellipse id="ob-wl-' + uid + '" cx="31" cy="78" rx="14" ry="6" fill="rgba(200,240,255,0.32)" stroke="rgba(200,240,255,0.5)" stroke-width="0.6" style="transform-box:fill-box;transform-origin:right center;transform:rotate(-22deg)"/>' +
      '<ellipse id="ob-wr-' + uid + '" cx="69" cy="78" rx="14" ry="6" fill="rgba(200,240,255,0.32)" stroke="rgba(200,240,255,0.5)" stroke-width="0.6" style="transform-box:fill-box;transform-origin:left center;transform:rotate(22deg)"/>' +
      /* body */
      '<ellipse cx="50" cy="92" rx="22" ry="18" fill="#F5C800"/>' +
      '<rect x="28" y="84" width="44" height="6" fill="#111" clip-path="url(#ob-' + uid + ')"/>' +
      '<rect x="28" y="95" width="44" height="6" fill="#111" clip-path="url(#ob-' + uid + ')"/>' +
      '<path d="M47,109 Q50,115 53,109" stroke="#111" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
      /* left arm, animated toward phone */
      '<g id="ob-al-' + uid + '" style="transform-origin:37px 86px;transition:transform 0.5s cubic-bezier(0.34,1.56,0.64,1);">' +
        '<line x1="37" y1="86" x2="25" y2="100" stroke="#111" stroke-width="2" stroke-linecap="round"/>' +
        '<circle cx="23" cy="102" r="3" fill="#F5C800" stroke="#111" stroke-width="0.8"/>' +
      '</g>' +
      /* right arm */
      '<line x1="63" y1="86" x2="75" y2="100" stroke="#111" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="77" cy="102" r="3" fill="#F5C800" stroke="#111" stroke-width="0.8"/>' +
      /* legs dangling */
      '<line x1="40" y1="107" x2="34" y2="122" stroke="#111" stroke-width="1.5" stroke-linecap="round"/>' +
      '<line x1="34" y1="122" x2="30" y2="127" stroke="#111" stroke-width="1.5" stroke-linecap="round"/>' +
      '<line x1="60" y1="107" x2="66" y2="122" stroke="#111" stroke-width="1.5" stroke-linecap="round"/>' +
      '<line x1="66" y1="122" x2="70" y2="127" stroke="#111" stroke-width="1.5" stroke-linecap="round"/>' +
      /* head, shifted down 12px to close gap with body */
      '<g transform="translate(0,12)">' +
      '<circle cx="50" cy="40" r="22" fill="#F5C800"/>' +
      '<circle cx="38" cy="46" r="5" fill="#FFA040" opacity="0.2"/>' +
      '<circle cx="62" cy="46" r="5" fill="#FFA040" opacity="0.2"/>' +
      /* white lens fills */
      '<rect x="27" y="28" width="18" height="15" rx="2.5" fill="white"/>' +
      '<rect x="55" y="28" width="18" height="15" rx="2.5" fill="white"/>' +
      /* bored droopy eyes */
      '<ellipse cx="42" cy="38" rx="4.5" ry="4.5" fill="#111"/>' +
      '<ellipse cx="58" cy="38" rx="4.5" ry="4.5" fill="#111"/>' +
      '<circle cx="43.5" cy="36.5" r="1.3" fill="white" opacity="0.85"/>' +
      '<circle cx="59.5" cy="36.5" r="1.3" fill="white" opacity="0.85"/>' +
      /* droopy lids, half-covering eyes */
      '<rect x="37" y="33" width="10" height="5.5" rx="2.5" fill="white"' +
      ' style="transform-box:fill-box;transform-origin:center top;animation:beeBlink 6s ease-in-out infinite;"/>' +
      '<rect x="53" y="33" width="10" height="5.5" rx="2.5" fill="white"' +
      ' style="transform-box:fill-box;transform-origin:center top;animation:beeBlink 6s ease-in-out infinite 0.08s;"/>' +
      /* glasses, oversized */
      '<rect x="26" y="27" width="20" height="17" rx="3" fill="none" stroke="#111" stroke-width="2.8"/>' +
      '<rect x="54" y="27" width="20" height="17" rx="3" fill="none" stroke="#111" stroke-width="2.8"/>' +
      '<line x1="46" y1="35.5" x2="54" y2="35.5" stroke="#111" stroke-width="2.8"/>' +
      '<line x1="26" y1="35.5" x2="20" y2="38" stroke="#111" stroke-width="2.5"/>' +
      '<line x1="74" y1="35.5" x2="80" y2="38" stroke="#111" stroke-width="2.5"/>' +
      /* flat bored mouth */
      '<path d="M43,51 Q50,50 57,51" fill="none" stroke="#111" stroke-width="1.8" stroke-linecap="round"/>' +
      /* antennae */
      '<line x1="43" y1="20" x2="35" y2="6" stroke="#111" stroke-width="1.8" stroke-linecap="round"/>' +
      '<circle cx="33" cy="4" r="3" fill="#111"/>' +
      '<line x1="57" y1="20" x2="65" y2="6" stroke="#111" stroke-width="1.8" stroke-linecap="round"/>' +
      '<circle cx="67" cy="4" r="3" fill="#111"/>' +
      '</g>' +
      /* phone, starts hidden */
      '<g id="ob-ph-' + uid + '" style="opacity:0;' +
      'transform:translateY(10px) scale(0.4);transform-origin:18px 96px;' +
      'transition:opacity 0.35s ease,transform 0.4s cubic-bezier(0.34,1.56,0.64,1);">' +
        '<rect x="10" y="88" width="16" height="24" rx="2.5" fill="#111" stroke="#333" stroke-width="0.8"/>' +
        '<rect id="ob-sc-' + uid + '" x="11.5" y="92" width="13" height="17" rx="1" fill="#1565C0"/>' +
        '<line x1="13" y1="95" x2="23" y2="95" stroke="white" stroke-width="0.8" opacity="0.8"/>' +
        '<line x1="13" y1="98" x2="21" y2="98" stroke="white" stroke-width="0.8" opacity="0.5"/>' +
        '<rect x="13" y="102" width="10" height="4" rx="1" fill="#F5C800" opacity="0.95"/>' +
        '<line x1="15" y1="109" x2="21" y2="109" stroke="#444" stroke-width="1" stroke-linecap="round"/>' +
      '</g>' +
      /* toast bubble */
      '<g id="ob-t-' + uid + '" style="opacity:0;pointer-events:none;">' +
        '<rect x="-4" y="-20" width="74" height="17" rx="8.5" fill="#F5C800"/>' +
        '<text x="33" y="-8" text-anchor="middle"' +
        ' font-family="monospace" font-size="7.5" font-weight="700" fill="#111">Posted! &#x1F41D;</text>' +
      '</g>' +
      '</svg>'
    );

    dz.appendChild(wrap);

    var ph  = document.getElementById('ob-ph-' + uid);
    var sc  = document.getElementById('ob-sc-' + uid);
    var tst = document.getElementById('ob-t-'  + uid);
    var arm = document.getElementById('ob-al-' + uid);

    /* slow idle bob */
    (function bob() {
      setTimeout(function () {
        wrap.style.transition = 'transform 0.22s ease-in-out';
        wrap.style.transform  = 'translateY(-5px)';
        setTimeout(function () {
          wrap.style.transform = 'translateY(0px)';
          setTimeout(function () { wrap.style.transition = ''; bob(); }, 300);
        }, 220);
      }, 4500 + Math.random() * 5500);
    }());

    /* phone check cycle */
    function doPhone() {
      if (arm) arm.style.transform = 'rotate(-48deg)';
      if (ph)  { ph.style.opacity = '1'; ph.style.transform = 'translateY(0) scale(1)'; }
      if (sc)  sc.style.animation = 'obGlow 2s ease-in-out infinite';

      setTimeout(function () {
        if (!tst) return;
        tst.style.animation = 'none';
        tst.style.opacity   = '0';
        void tst.offsetWidth;
        tst.style.animation = 'obToast 2.4s ease-out forwards';
      }, 2600);

      setTimeout(function () {
        if (arm) arm.style.transform = '';
        if (ph)  { ph.style.opacity = '0'; ph.style.transform = 'translateY(10px) scale(0.4)'; }
        if (sc)  sc.style.animation = '';
        schedulePhone();
      }, 5000);
    }

    function schedulePhone() {
      setTimeout(doPhone, 11000 + Math.random() * 13000);
    }
    schedulePhone();

    /* occasional wing flutter */
    var wl = document.getElementById('ob-wl-' + uid);
    var wr = document.getElementById('ob-wr-' + uid);
    (function scheduleFlutter() {
      setTimeout(function () {
        if (wl) wl.style.animation = 'wingFlap 0.13s linear 6';
        if (wr) wr.style.animation = 'wingFlapR 0.13s linear 6';
        setTimeout(function () {
          if (wl) wl.style.animation = '';
          if (wr) wr.style.animation = '';
          scheduleFlutter();
        }, 900);
      }, 8000 + Math.random() * 12000);
    }());
  }

  /* ── colony helpers (unchanged from v3) ─────────────────────────── */
  function createBee(expression) {
    var div = document.createElement('div');
    div.className = 'bee';
    div.innerHTML = makeBuzzSVG(expression || 'neutral');
    document.body.appendChild(div);
    return div;
  }

  function doBob(bee, x, y) {
    bee.style.left = x + 'px';
    bee.style.top  = y + 'px';
    bee.style.animation = 'beeBob 2s ease-in-out infinite';
  }

  function doPeek(bee, x, bottomY) {
    bee.style.left      = x + 'px';
    bee.style.bottom    = (bottomY - 52) + 'px';
    bee.style.top       = 'auto';
    bee.style.overflow  = 'hidden';
    bee.style.animation = 'beePeek 4s ease-in-out infinite 1s';
  }

  function doFlyby(bee, fromRight, y) {
    if (fromRight) {
      bee.style.right = '0';
      bee.style.left  = 'auto';
      bee.style.top   = y + 'px';
      bee.style.animationName = 'beeFlyPathR';
    } else {
      bee.style.left = '-80px';
      bee.style.top  = y + 'px';
      bee.style.animationName = 'beeFlyPath';
    }
    var dur = (8 + Math.random() * 4).toFixed(2);
    bee.style.animationDuration       = dur + 's';
    bee.style.animationTimingFunction = 'linear';
    bee.style.animationFillMode       = 'forwards';
    bee.addEventListener('animationend', function () {
      if (bee.parentNode) bee.parentNode.removeChild(bee);
    });
  }

  function doIdle(bee, x, y) {
    bee.style.left = x + 'px';
    bee.style.top  = y + 'px';
    (function scheduleBob() {
      setTimeout(function () {
        bee.style.transition = 'transform 0.15s ease-in-out';
        bee.style.transform  = 'translateY(-5px)';
        setTimeout(function () {
          bee.style.transform = 'translateY(0px)';
          setTimeout(function () { bee.style.transition = ''; scheduleBob(); }, 300);
        }, 150);
      }, 4000 + Math.random() * 4000);
    }());
  }

  function doPerch(bee, element, ox, oy) {
    bee.style.position = 'absolute';
    bee.style.left     = ox + 'px';
    bee.style.top      = oy + 'px';
    bee.style.zIndex   = '10';
    if (window.getComputedStyle(element).position === 'static') element.style.position = 'relative';
    if (bee.parentNode) bee.parentNode.removeChild(bee);
    element.appendChild(bee);
    var wL = bee.querySelector('.wL');
    var wR = bee.querySelector('.wR');
    if (wL) wL.style.animation = 'none';
    if (wR) wR.style.animation = 'none';
    (function scheduleBob() {
      setTimeout(function () {
        bee.style.transition = 'transform 0.2s ease-in-out';
        bee.style.transform  = 'translateY(-5px)';
        setTimeout(function () {
          bee.style.transform = 'translateY(0px)';
          setTimeout(function () { bee.style.transition = ''; scheduleBob(); }, 300);
        }, 200);
      }, 5000 + Math.random() * 5000);
    }());
  }

  var expressions = ['neutral', 'grin', 'frown', 'grin', 'neutral'];
  function rExpr() { return expressions[Math.floor(Math.random() * expressions.length)]; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
  }

  /* ── colony spawn ────────────────────────────────────────────────── */
  function spawnColony() {
    var W = window.innerWidth;
    var H = window.innerHeight;
    var mobile = W < 768;

    if (mobile) {
      var mbee = function (e) { var b = createBee(e); b.style.width = '30px'; return b; };
      setTimeout(function () {
        var dz = document.getElementById('dropzone');
        if (dz) spawnOfficeBee(dz);
      }, 1000);
      setTimeout(spawnBuddyBee, 1400);
      setTimeout(function () { doFlyby(mbee(rExpr()), false, rand(H * 0.25, H * 0.55)); }, 1600);
      setTimeout(function () { doBob(mbee('grin'), rand(W * 0.72, W * 0.88), rand(H * 0.62, H * 0.78)); }, 2600);
      (function flyM() {
        setTimeout(function () {
          doFlyby(mbee(rExpr()), Math.random() > 0.5, rand(H * 0.2, H * 0.65));
          flyM();
        }, rand(22000, 35000));
      }());
      return;
    }

    /* desktop: office bee on dropzone corner */
    setTimeout(function () {
      var dz = document.getElementById('dropzone');
      if (dz) spawnOfficeBee(dz);
    }, 800);
    setTimeout(spawnBuddyBee, 1200);

    /* rest of the colony */
    var pool = [
      function () { doFlyby(createBee(rExpr()), false, rand(H * 0.2, H * 0.7)); },
      function () { doBob(createBee(rExpr()), rand(W * 0.1, W * 0.4), rand(H * 0.55, H * 0.75)); },
      function () { doBob(createBee('grin'), rand(W * 0.6, W * 0.85), rand(H * 0.4, H * 0.65)); },
      function () { doPeek(createBee('neutral'),rand(W * 0.2, W * 0.5), rand(100, 160)); },
      function () { doIdle(createBee('frown'), rand(W * 0.7, W * 0.9), rand(H * 0.5, H * 0.75)); },
      function () { doPeek(createBee('grin'), rand(W * 0.65, W * 0.85), rand(80, 140)); },
    ];
    shuffle(pool);
    var count = 2 + Math.floor(Math.random() * 2);
    for (var i = 0; i < count; i++) {
      (function (fn, delay) { setTimeout(fn, delay); })(pool[i], i * 600 + rand(400, 1200));
    }
    (function fly() {
      setTimeout(function () {
        doFlyby(createBee(rExpr()), Math.random() > 0.5, rand(H * 0.15, H * 0.7));
        fly();
      }, rand(18000, 30000));
    }());
  }

  /* ── scan-section visibility observer (null-safe) ───────────────── */
  var scanSection = document.getElementById('scanning');
  if (scanSection) {
    (new MutationObserver(function () {
      var hide = scanSection.style.display === 'flex';
      document.querySelectorAll('.bee,[data-bee]').forEach(function (b) {
        b.style.visibility = hide ? 'hidden' : 'visible';
      });
    })).observe(scanSection, { attributes: true, attributeFilter: ['style'] });
  }

  /* ── score gather ────────────────────────────────────────────────── */
  function scheduleMicroBob(bee) {
    setTimeout(function () {
      bee.style.transition = 'transform 0.2s ease-in-out';
      bee.style.transform  = 'translateY(-4px)';
      setTimeout(function () {
        bee.style.transform = 'translateY(0)';
        setTimeout(function () { bee.style.transition = ''; scheduleMicroBob(bee); }, 250);
      }, 200);
    }, 2500 + Math.random() * 3500);
  }

  function gatherAtScore() {
    var wrap = document.querySelector('.gauge-container');
    if (!wrap) return;
    var bees = Array.from(document.querySelectorAll('.bee,[data-bee]'));
    if (!bees.length) return;
    var rect   = wrap.getBoundingClientRect();
    var cx     = rect.left + rect.width  / 2;
    var cy     = rect.top  + rect.height / 2;
    var slots  = [[-78,-78],[26,-85],[92,-12],[32,68],[-82,20],[-20,-92]];
    bees.forEach(function (b, i) {
      var slot  = slots[i % slots.length];
      var bRect = b.getBoundingClientRect();
      if (b.parentNode && b.parentNode !== document.body) document.body.appendChild(b);
      b.style.position   = 'fixed';
      b.style.left       = bRect.left + 'px';
      b.style.top        = bRect.top  + 'px';
      b.style.bottom = b.style.right = 'auto';
      b.style.animation  = 'none';
      b.style.transform  = '';
      b.style.visibility = 'visible';
      var bW = parseInt(b.style.width) || 56;
      var tl = cx + slot[0] - bW / 2;
      var tt = cy + slot[1] - 26;
      (function (bee, targetL, targetT, delay) {
        setTimeout(function () {
          bee.style.transition = 'left 0.9s cubic-bezier(0.4,0,0.2,1),top 0.9s cubic-bezier(0.4,0,0.2,1)';
          bee.style.left = targetL + 'px';
          bee.style.top  = targetT + 'px';
          setTimeout(function () {
            bee.style.transition = '';
            var wL = bee.querySelector('.wL');
            var wR = bee.querySelector('.wR');
            if (wL) wL.style.animation = 'wingFlap 0.13s linear infinite';
            if (wR) wR.style.animation = 'wingFlapR 0.13s linear infinite';
            scheduleMicroBob(bee);
          }, 950);
        }, delay);
      })(b, tl, tt, i * 150 + 200);
    });
  }

  /* ── draggable buddy bee, stays where dropped ──────────────────── */
  function spawnBuddyBee() {
    var mobile = window.innerWidth < 768;
    var SIZE   = mobile ? 44 : 54;
    var PAD    = 20;

    var bee = document.createElement('div');
    bee.setAttribute('data-bee', 'buddy');
    bee.innerHTML = makeBuzzSVG('neutral');
    bee.style.cssText = [
      'position:fixed',
      'left:0',
      'top:0',
      'width:' + SIZE + 'px',
      'z-index:1000',
      'cursor:grab',
      'touch-action:none',
      'user-select:none',
      '-webkit-user-select:none',
      'filter:drop-shadow(0 2px 12px rgba(245,200,0,0.3))'
    ].join(';');
    document.body.appendChild(bee);

    var HSIZE = mobile ? 34 : 42;
    var hive = document.createElement('div');
    hive.id = 'secret-hive';
    hive.style.cssText = [
      'position:fixed',
      'top:' + PAD + 'px',
      'left:' + PAD + 'px',
      'width:' + HSIZE + 'px',
      'opacity:0.14',
      'transition:opacity 0.25s,filter 0.25s,transform 0.25s',
      'pointer-events:none',
      'z-index:999'
    ].join(';');
    hive.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 56" width="' + HSIZE + '" height="' + Math.round(HSIZE * 56 / 48) + '">' +
      '<path d="M24 3L45 15V41L24 53L3 41V15Z" fill="rgba(201,168,76,0.22)" stroke="#C9A84C" stroke-width="1.5"/>' +
      '<path d="M24 13L34 19V31L24 37L14 31V19Z" fill="rgba(201,168,76,0.18)" stroke="#C9A84C" stroke-width="1"/>' +
      '<ellipse cx="24" cy="47" rx="6" ry="4" fill="rgba(0,0,0,0.5)" stroke="#C9A84C" stroke-width="0.8"/>' +
      '</svg>';
    document.body.appendChild(hive);

    function hiveRect() { return hive.getBoundingClientRect(); }
    function nearHive(cx, cy) {
      var r = hiveRect();
      var hcx = r.left + r.width / 2, hcy = r.top + r.height / 2;
      return Math.sqrt(Math.pow(cx - hcx, 2) + Math.pow(cy - hcy, 2)) < 90;
    }
    function onHive(cx, cy) {
      var r = hiveRect();
      return cx > r.left - 16 && cx < r.right + 16 && cy > r.top - 16 && cy < r.bottom + 16;
    }

    var wL = bee.querySelector('.wL');
    var wR = bee.querySelector('.wR');
    if (wL) wL.style.animation = 'none';
    if (wR) wR.style.animation = 'none';

    var dragging = false;
    var hasMoved = false;
    var dragOffX = 0, dragOffY = 0;

    function wingsOn() {
      var w1 = bee.querySelector('.wL'), w2 = bee.querySelector('.wR');
      if (w1) w1.style.animation = 'wingFlap 0.13s linear infinite';
      if (w2) w2.style.animation = 'wingFlapR 0.13s linear infinite';
    }

    function wingsOff() {
      var w1 = bee.querySelector('.wL'), w2 = bee.querySelector('.wR');
      if (w1) w1.style.animation = 'none';
      if (w2) w2.style.animation = 'none';
    }

    function scheduleBob() {
      setTimeout(function () {
        if (dragging) return;
        bee.style.transition = 'transform 0.22s ease-in-out';
        bee.style.transform  = 'translateY(-4px)';
        setTimeout(function () {
          bee.style.transform = 'translateY(0)';
          setTimeout(function () { bee.style.transition = ''; scheduleBob(); }, 250);
        }, 220);
      }, 2800 + Math.random() * 3800);
    }

    function startDrag(cx, cy) {
      dragging = true;
      bee.style.cursor     = 'grabbing';
      bee.style.transform  = 'scale(1.08)';
      bee.style.transition = 'transform 0.1s ease';
      bee.style.zIndex     = '1001';
      var r = bee.getBoundingClientRect();
      dragOffX = cx - (r.left + r.width  / 2);
      dragOffY = cy - (r.top  + r.height / 2);
      wingsOn();
    }

    function moveDrag(cx, cy) {
      if (!dragging) return;
      var nx = Math.max(0, Math.min(window.innerWidth  - SIZE, cx - dragOffX - SIZE / 2));
      var ny = Math.max(0, Math.min(window.innerHeight - SIZE, cy - dragOffY - SIZE / 2));
      bee.style.transition = 'none';
      bee.style.left = nx + 'px';
      bee.style.top  = ny + 'px';
      if (nearHive(cx, cy)) {
        hive.style.opacity = '0.95';
        hive.style.filter  = 'drop-shadow(0 0 10px rgba(201,168,76,0.9))';
        hive.style.transform = 'scale(1.12)';
      } else {
        hive.style.opacity = '0.14';
        hive.style.filter  = '';
        hive.style.transform = '';
      }
    }

    function overlapsInteractive(cx, cy) {
      var R  = SIZE * 1.1;
      var dz = document.getElementById('dropzone');
      if (dz) {
        var r = dz.getBoundingClientRect();
        if (cx > r.left - R && cx < r.right + R && cy > r.top - R && cy < r.bottom + R) return true;
      }
      var els = document.querySelectorAll('a[href],button,input,label');
      for (var i = 0; i < els.length; i++) {
        var ir = els[i].getBoundingClientRect();
        if (!ir.width) continue;
        if (cx > ir.left - R && cx < ir.right + R && cy > ir.top - R && cy < ir.bottom + R) return true;
      }
      return false;
    }

    function findSafe(cx, cy) {
      var offsets = [[0,-90],[0,90],[-90,0],[90,0],[-70,-70],[70,-70],[-70,70],[70,70],[0,-130],[0,130]];
      for (var i = 0; i < offsets.length; i++) {
        var nx = Math.max(SIZE / 2 + 4, Math.min(window.innerWidth  - SIZE / 2 - 4, cx + offsets[i][0]));
        var ny = Math.max(SIZE / 2 + 4, Math.min(window.innerHeight - SIZE / 2 - 4, cy + offsets[i][1]));
        if (!overlapsInteractive(nx, ny)) return { x: nx, y: ny };
      }
      return { x: window.innerWidth - SIZE / 2 - PAD, y: window.innerHeight - SIZE / 2 - PAD };
    }

    function pickSafePos() {
      var navH = 80;
      var minX = PAD, maxX = window.innerWidth  - SIZE - PAD;
      var minY = navH, maxY = window.innerHeight - SIZE - PAD;
      for (var i = 0; i < 20; i++) {
        var tx = minX + Math.random() * (maxX - minX);
        var ty = minY + Math.random() * (maxY - minY);
        if (!overlapsInteractive(tx + SIZE / 2, ty + SIZE / 2)) return { x: tx, y: ty };
      }
      return { x: PAD, y: window.innerHeight - SIZE - PAD };
    }

    var pos = pickSafePos();
    bee.style.left = pos.x + 'px';
    bee.style.top  = pos.y + 'px';

    function endDrag(cx, cy) {
      if (!dragging) return;
      dragging = false;
      hive.style.opacity   = '0.14';
      hive.style.filter    = '';
      hive.style.transform = '';

      if (onHive(cx, cy)) {
        var hr = hiveRect();
        bee.style.transition = 'left 0.3s ease,top 0.3s ease,transform 0.45s cubic-bezier(0.4,0,0.6,1),opacity 0.35s ease';
        bee.style.left       = (hr.left + hr.width  / 2 - SIZE / 2) + 'px';
        bee.style.top        = (hr.top  + hr.height / 2 - SIZE / 2) + 'px';
        bee.style.transform  = 'scale(0.1) rotate(720deg)';
        bee.style.opacity    = '0';
        hive.style.transition = 'opacity 0.2s,filter 0.2s,transform 0.2s';
        hive.style.opacity   = '1';
        hive.style.filter    = 'drop-shadow(0 0 18px rgba(201,168,76,1))';
        hive.style.transform = 'scale(1.25)';
        setTimeout(function () { window.location.href = '/bee'; }, 520);
        return;
      }

      bee.style.cursor = 'grab';
      bee.style.zIndex = '1000';
      var nx = Math.max(SIZE / 2, Math.min(window.innerWidth  - SIZE / 2, cx - dragOffX));
      var ny = Math.max(SIZE / 2, Math.min(window.innerHeight - SIZE / 2, cy - dragOffY));
      if (overlapsInteractive(nx, ny)) { var safe = findSafe(nx, ny); nx = safe.x; ny = safe.y; }
      var dl = nx - SIZE / 2;
      var dt = ny - SIZE / 2;
      bee.style.transition = 'left 0.25s cubic-bezier(0.34,1.56,0.64,1),top 0.25s cubic-bezier(0.34,1.56,0.64,1),transform 0.2s ease';
      bee.style.left      = dl + 'px';
      bee.style.top       = dt + 'px';
      bee.style.transform = '';
      hasMoved = true;
      setTimeout(function () {
        bee.style.transition = '';
        scheduleBob();
      }, 280);
    }

    bee.addEventListener('mousedown', function (e) { e.preventDefault(); startDrag(e.clientX, e.clientY); });
    window.addEventListener('mousemove', function (e) { if (dragging) { e.preventDefault(); moveDrag(e.clientX, e.clientY); } });
    window.addEventListener('mouseup', function (e) { if (dragging) endDrag(e.clientX, e.clientY); });

    bee.addEventListener('touchstart', function (e) { e.preventDefault(); var t = e.touches[0]; startDrag(t.clientX, t.clientY); }, { passive: false });
    window.addEventListener('touchmove', function (e) { if (dragging) { e.preventDefault(); var t = e.touches[0]; moveDrag(t.clientX, t.clientY); } }, { passive: false });
    window.addEventListener('touchend', function (e) { if (dragging) { var t = e.changedTouches[0]; endDrag(t.clientX, t.clientY); } });

    scheduleBob();
  }

  window.ResumeBuzzBees = { gather: gatherAtScore };

  /* ── inject keyframes for office-bee phone animation ────────────── */
  var s = document.createElement('style');
  s.textContent =
    '@keyframes obGlow{0%,100%{fill:#1565C0}50%{fill:#1E88E5}}' +
    '@keyframes obToast{' +
      '0%{opacity:0;transform:translateY(0)}' +
      '14%{opacity:1;transform:translateY(-6px)}' +
      '70%{opacity:1;transform:translateY(-14px)}' +
      '100%{opacity:0;transform:translateY(-26px)}}';
  document.head.appendChild(s);

  /* ── boot ────────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', spawnColony);
  } else {
    setTimeout(spawnColony, 500);
  }
}());

(function () {
  function yearsFrom(y, m, d) {
    var now = new Date();
    var yrs = now.getFullYear() - y;
    if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) yrs--;
    return yrs;
  }
  var n = yearsFrom(2012, 1, 2);
  document.querySelectorAll('.ryz').forEach(function(el) { el.textContent = n; });
}());
