/* ════════════════════════════════════════════════════════════════════════════════
   MORYA LODGING — IMMERSIVE 3D EXPERIENCE v2.0
   MAXIMUM DRAMATIC ANIMATIONS — Card Shuffle, Door Opening, 3D Room, Shader Lines
   ════════════════════════════════════════════════════════════════════════════════ */

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════
   1. LOADING SCREEN — Cinematic fade
   ═══════════════════════════════════════════════════════ */
window.addEventListener('load', function () {
  var loader = document.getElementById('loader');
  if (loader) {
    setTimeout(function () {
      loader.classList.add('hidden');
      setTimeout(function () { loader.remove(); }, 1000);
    }, 2200);
  }
  setTimeout(function () { ScrollTrigger.refresh(); }, 600);
});

/* ═══════════════════════════════════════════════════════
   2. LENIS SMOOTH SCROLL — with graceful fallback
   ═══════════════════════════════════════════════════════ */
var lenis = null;
var lenisEnabled = false;

// Normalize ScrollTrigger touch/wheel events first (beneficial with or without Lenis)
ScrollTrigger.normalizeScroll(true);

try {
  if (typeof Lenis === 'undefined') throw new Error('Lenis library not loaded');
  lenis = new Lenis({
    duration: 1.2,
    easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
    smoothWheel: true,
    smoothTouch: false
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);
  lenisEnabled = true;

  // Refresh ScrollTrigger after Lenis establishes virtual scroll height
  requestAnimationFrame(function () { ScrollTrigger.refresh(); });
  setTimeout(function () { ScrollTrigger.refresh(); }, 300);
} catch (e) {
  console.warn('Lenis smooth scroll unavailable — falling back to native scroll:', e.message);
}

// Safe scroll helper — uses Lenis when available, native smooth scroll as fallback
function safeScrollTo(selector, offset) {
  offset = offset || 0;
  var target = document.querySelector(selector);
  if (!target) return;
  if (lenis && lenisEnabled) {
    lenis.scrollTo(target, { offset: -offset });
  } else {
    var y = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
}



/* ═══════════════════════════════════════════════════════
   4. SCROLL PROGRESS
   ═══════════════════════════════════════════════════════ */
ScrollTrigger.create({ trigger: 'body', start: 'top top', end: 'bottom bottom',
  onUpdate: function (self) { document.getElementById('scrollProgress').style.scale = self.progress + ' 1'; }
});

/* ═══════════════════════════════════════════════════════
   🌊 5. SHADER LINES — DRAMATIC MOUSE-REACTIVE AURORA
   Makes the entire background feel alive and breathing
   ═══════════════════════════════════════════════════════ */
(function () {
  var shader = document.getElementById('shaderLines');
  if (!shader) return;

  // Add extra ribbon layer
  var ribbon = document.createElement('div');
  ribbon.className = 'shader-ribbon';
  shader.appendChild(ribbon);

  // Only enable mouse-reactive movement on non-touch devices with enough screen space
  var isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (window.innerWidth < 768 || isTouchDevice) return;

  // Mouse-reactive movement — the aurora FOLLOWS your cursor
  document.addEventListener('mousemove', function (e) {
    var xOff = (e.clientX / window.innerWidth - 0.5) * 40;
    var yOff = (e.clientY / window.innerHeight - 0.5) * 30;
    gsap.to(shader, { x: xOff, y: yOff, duration: 2, ease: 'power2.out' });
  });
})();

/* ═══════════════════════════════════════════════════════
   6. CIRCLE ANIMATOR — DRAMATIC FLOATING ORBS
   ═══════════════════════════════════════════════════════ */
(function () {
  var container = document.getElementById('circleAnimator');
  if (!container) return;
  var colors = [
    'rgba(255,107,53,0.15)', 'rgba(212,175,55,0.12)', 'rgba(107,39,55,0.10)',
    'rgba(255,107,53,0.10)', 'rgba(212,175,55,0.08)'
  ];
  var winW = window.innerWidth;
  var count = winW < 480 ? 3 : winW < 768 ? 6 : winW < 1024 ? 10 : 15;

  for (var i = 0; i < count; i++) {
    var c = document.createElement('div');
    c.className = 'animated-circle';
    var size = 100 + Math.random() * 400;
    c.style.width = size + 'px'; c.style.height = size + 'px';
    c.style.background = 'radial-gradient(circle, ' + colors[i % colors.length] + ', transparent 70%)';
    c.style.left = Math.random() * 100 + '%';
    c.style.top = Math.random() * 100 + '%';
    c.style.filter = 'blur(' + (40 + Math.random() * 60) + 'px)';
    c.style.setProperty('--dur', (25 + Math.random() * 35) + 's');
    c.style.setProperty('--pulse', (12 + Math.random() * 18) + 's');
    c.style.setProperty('--dx1', (Math.random() * 80 - 40) + 'px');
    c.style.setProperty('--dy1', (Math.random() * 80 - 40) + 'px');
    c.style.setProperty('--dx2', (Math.random() * 80 - 40) + 'px');
    c.style.setProperty('--dy2', (Math.random() * 80 - 40) + 'px');
    c.style.setProperty('--dx3', (Math.random() * 80 - 40) + 'px');
    c.style.setProperty('--dy3', (Math.random() * 80 - 40) + 'px');
    c.style.setProperty('--op', (0.08 + Math.random() * 0.12).toString());
    c.style.animationDelay = '-' + (Math.random() * 20) + 's';
    container.appendChild(c);
  }
})();

/* ═══════════════════════════════════════════════════════
   7. PARTICLE SYSTEM
   ═══════════════════════════════════════════════════════ */
(function () {
  var container = document.getElementById('particleContainer');
  if (!container) return;
  var winW = window.innerWidth;
  var isMobile = winW < 768;
  var isSmall = winW < 480;
  var symbols = ['🌸', '🪷', '🌺', '✦', '✧', '·'];
  var active = 0, max = isSmall ? 4 : isMobile ? 8 : 25;
  var intervalMs = isSmall ? 2500 : isMobile ? 1500 : 600;

  function create() {
    if (active >= max) return;
    var p = document.createElement('div'); p.className = 'particle';
    var isOrb = Math.random() > 0.5;
    var size = isSmall ? 5 + Math.random() * 8 : 8 + Math.random() * 16;
    var dur = 12 + Math.random() * 18;
    if (isOrb) {
      p.style.width = size + 'px'; p.style.height = size + 'px';
      p.style.background = 'radial-gradient(circle, rgba(212,175,55,0.7), transparent 70%)';
      p.style.borderRadius = '50%';
    } else {
      p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      p.style.fontSize = size + 'px';
    }
    p.style.left = Math.random() * 100 + '%';
    p.style.setProperty('--p-dur', dur + 's');
    p.style.setProperty('--p-drift', ((Math.random() - 0.5) * 100) + 'px');
    p.style.setProperty('--p-rotate', (Math.random() * 720) + 'deg');
    p.style.setProperty('--p-opacity', (0.4 + Math.random() * 0.4).toString());
    p.style.animationDuration = dur + 's';
    container.appendChild(p); active++;
    setTimeout(function () { p.remove(); active--; }, (dur + 2) * 1000);
  }
  setInterval(create, intervalMs);
  for (var i = 0; i < 8; i++) { if (active < max) create(); }
})();

/* ═══════════════════════════════════════════════════════
   8. MAGNETIC BUTTONS
   ═══════════════════════════════════════════════════════ */
(function () {
  var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (window.innerWidth < 768 || isTouch) return;
  document.querySelectorAll('.btn-primary, .btn-outline, .nav-cta, .contact-btn-primary, .contact-btn-secondary, .room-card-btn, .spread-toggle').forEach(function (btn) {
    btn.addEventListener('mousemove', function (e) {
      var r = btn.getBoundingClientRect();
      var x = e.clientX - r.left - r.width / 2;
      var y = e.clientY - r.top - r.height / 2;
      gsap.to(btn, { x: x * 0.3, y: y * 0.3, duration: 0.3, ease: 'power2.out' });
    });
    btn.addEventListener('mouseleave', function () {
      gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
    });
  });
})();

/* ═══════════════════════════════════════════════════════
   9. CIRCLE HOVER EFFECTS
   ═══════════════════════════════════════════════════════ */
(function () {
  var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (window.innerWidth < 768 || isTouch) return;
  document.querySelectorAll('.btn-primary, .btn-outline, .room-card-btn, .contact-btn-primary, .contact-btn-secondary, .nav-cta').forEach(function (el) {
    el.addEventListener('mouseenter', function (e) {
      var c = el.querySelector('.circle-hover-container');
      if (!c) return;
      var r = el.getBoundingClientRect();
      var cx = e.clientX - r.left, cy = e.clientY - r.top;
      for (var i = 0; i < 3; i++) {
        (function (d) {
          setTimeout(function () {
            var circle = document.createElement('div');
            circle.className = 'hover-circle';
            circle.style.left = cx + 'px'; circle.style.top = cy + 'px';
            circle.style.width = (40 + d * 15) + 'px'; circle.style.height = (40 + d * 15) + 'px';
            c.appendChild(circle);
            setTimeout(function () { circle.remove(); }, 1500);
          }, d * 300);
        })(i);
      }
    });
  });
})();

/* ═══════════════════════════════════════════════════════
   10. HERO CINEMATIC ANIMATION
   ═══════════════════════════════════════════════════════ */
var heroTL = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 2.2 });

(function () {
  var titleEl = document.getElementById('heroTitle');
  if (!titleEl) return;
  var html = titleEl.innerHTML;
  var spans = [];
  var temp = document.createElement('div'); temp.innerHTML = html;
  var wrapper = document.createElement('div'); wrapper.style.display = 'inline';

  function process(parent, container) {
    var nodes = parent.childNodes;
    for (var n = 0; n < nodes.length; n++) {
      var node = nodes[n];
      if (node.nodeType === 3) {
        var text = node.textContent;
        for (var c = 0; c < text.length; c++) {
          var span = document.createElement('span');
          span.className = 'hero-char';
          span.textContent = text[c] === ' ' ? '\u00A0' : text[c];
          span.style.display = 'inline-block'; span.style.opacity = '0';
          container.appendChild(span);
          if (text[c] !== ' ') spans.push(span);
        }
      } else if (node.nodeType === 1 && node.tagName === 'EM') {
        var em = document.createElement('em');
        em.textContent = node.textContent;
        em.style.display = 'block'; em.style.opacity = '0';
        container.appendChild(em);
        spans.push(em);
      }
    }
  }
  process(temp, wrapper);
  titleEl.innerHTML = ''; titleEl.appendChild(wrapper); titleEl.style.opacity = '1';

  spans.forEach(function (s) { gsap.set(s, { opacity: 0, y: 60, rotateX: -90, transformPerspective: 600 }); });
  heroTL.to(spans, { opacity: 1, y: 0, rotateX: 0, duration: 0.9, stagger: 0.04, ease: 'back.out(1.4)' }, 0.5);
})();

gsap.set('#heroImageBg', { opacity: 0, scale: 1.1 });
gsap.set('#heroBadge', { y: 30, opacity: 0 });
gsap.set('#heroSub', { y: 30, opacity: 0, filter: 'blur(10px)' });
gsap.set('.hero-btns', { y: 30, scale: 0.9, opacity: 0 });
gsap.set('#heroDivider', { scaleX: 0, opacity: 0 });
gsap.set('#scrollIndicator', { y: 20, opacity: 0 });

heroTL
  .to('#heroImageBg', { opacity: 0.5, scale: 1, duration: 1.5, ease: 'power2.out' }, 0)
  .to('#heroBadge', { opacity: 1, y: 0, duration: 0.8 }, 0.3)
  .to('#heroSub', { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8 }, 1.0)
  .to('#heroDivider', { opacity: 1, scaleX: 1, duration: 0.6 }, 1.2)
  .to('.hero-btns', { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'back.out(2)' }, 1.4)
  .to('#scrollIndicator', { opacity: 1, y: 0, duration: 0.5 }, 2.0);

/* 11. HERO PARALLAX */
(function () {
  var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (window.innerWidth < 768 || isTouch) return;
  var hero = document.getElementById('hero');
  if (!hero) return;
  hero.addEventListener('mousemove', function (e) {
    var cx = (e.clientX / window.innerWidth - 0.5);
    var cy = (e.clientY / window.innerHeight - 0.5);
    gsap.to('.hero-orb-1', { x: cx * 50, y: cy * 40, duration: 1.2, ease: 'power2.out' });
    gsap.to('.hero-orb-2', { x: cx * -40, y: cy * -35, duration: 1.4, ease: 'power2.out' });
    gsap.to('.hero-orb-3', { x: cx * 25, y: cy * 25, duration: 1.6, ease: 'power2.out' });
    gsap.to('#heroContent', { x: cx * 10, y: cy * 6, duration: 1, ease: 'power2.out' });
  });
})();

gsap.to('.hero-orb-1', { y: -120, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.5 } });
gsap.to('.hero-orb-2', { y: 100, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.5 } });

/* 12. LOTUS PETALS */
(function () {
  var container = document.getElementById('heroPetals');
  if (!container) return;
  var symbols = ['🌸', '🪷', '🌺', '✿'];
  var count = window.innerWidth < 768 ? 8 : 20;
  for (var i = 0; i < count; i++) {
    var p = document.createElement('div'); p.className = 'lotus-petal';
    p.textContent = symbols[i % symbols.length];
    p.style.left = Math.random() * 100 + '%'; p.style.top = Math.random() * 100 + '%';
    p.style.fontSize = (10 + Math.random() * 14) + 'px';
    container.appendChild(p);
    gsap.to(p, {
      x: 'random(-100, 100)', y: 'random(-150, -50)',
      rotation: 'random(-180, 180)', opacity: 0,
      duration: 'random(10, 20)', repeat: -1, delay: 'random(0, 8)', ease: 'sine.inOut',
      onRepeat: function () {
        this._targets[0].style.left = Math.random() * 100 + '%';
        this._targets[0].style.top = Math.random() * 100 + '%';
        gsap.set(this._targets[0], { opacity: 0.3 + Math.random() * 0.3 });
      }
    });
  }
})();

/* 13. NAV SCROLL */
ScrollTrigger.create({ trigger: 'body', start: '80px top',
  onEnter: function () { document.getElementById('navbar').classList.add('scrolled'); },
  onLeaveBack: function () { document.getElementById('navbar').classList.remove('scrolled'); }
});

/* ═══════════════════════════════════════════════════════
   14. CARDS FADE IN — Simple reveal (no rotate/flip)
   ═══════════════════════════════════════════════════════ */
(function () {
  var cards = document.querySelectorAll('.room-card');
  if (!cards.length) return;
  cards.forEach(function (card, i) {
    gsap.from(card, {
      opacity: 0, y: 60, duration: 0.8, delay: i * 0.15,
      ease: 'power3.out',
      scrollTrigger: { trigger: '#roomsGrid', start: 'top 85%', toggleActions: 'play none none none' }
    });
  });
})();

/* ═══════════════════════════════════════════════════════
   15. CARD HOVER — Subtle lift only (no rotate/flip)
   ═══════════════════════════════════════════════════════ */
(function () {
  if (window.innerWidth < 768) return;
  document.querySelectorAll('.room-card').forEach(function (card) {
    card.addEventListener('mouseenter', function () {
      gsap.to(card, { scale: 1.02, y: -4, duration: 0.3, ease: 'power2.out' });
    });
    card.addEventListener('mouseleave', function () {
      gsap.to(card, { scale: 1, y: 0, duration: 0.4, ease: 'power3.out' });
    });
  });
})();

/* 16. CARD GRID VIEW TOGGLE */
(function () {
  var btn = document.getElementById('spreadToggle');
  var grid = document.getElementById('roomsGrid');
  if (!btn || !grid) return;
  var isSpread = false;
  btn.addEventListener('click', function () {
    isSpread = !isSpread;
    grid.classList.toggle('spread-view', isSpread);
    btn.querySelector('.spread-toggle-icon').textContent = isSpread ? '⊟' : '⊞';
  });
})();

/* ═══════════════════════════════════════════════════════
   🚪 17. DOOR OPENING ANIMATION — CINEMATIC 5-PHASE
   The signature "WOW" moment of the entire site
   ═══════════════════════════════════════════════════════ */
var roomData = {
  ac: {
    name: 'AC Comfort Room', price: '₹2,500 / night',
    desc: 'Modern comfort meets spiritual serenity. Cool, spacious, and thoughtfully appointed — your perfect sanctuary after a blessed day of pilgrimage.',
    interior: 'images/ac-room-interior.png',
    features: ['Air Conditioning', 'Queen Bed', 'Attached Bath', 'Hot Water 24/7', 'Free WiFi', 'Clean Linen Daily'],
    hotspots: [
      { x: '25%', y: '50%', icon: '🛏️', title: 'Queen Bed', desc: 'Premium mattress with plush pillows for deep, restful sleep.' },
      { x: '80%', y: '30%', icon: '🪟', title: 'Window View', desc: 'Natural light and serene views of the sacred surroundings.' },
      { x: '60%', y: '70%', icon: '❄️', title: 'Split AC', desc: 'Precise temperature control for year-round comfort.' }
    ]
  },
  nonac: {
    name: 'Traditional Comfort Room', price: '₹1,500 / night',
    desc: 'Traditional simplicity with modern amenities. Clean, comfortable, and perfect for pilgrims seeking affordable warmth near the temple.',
    interior: 'images/nonac-room-interior.png',
    features: ['Ceiling Fan', 'Comfortable Bed', 'Attached Bath', 'Hot Water', 'Free WiFi', 'Clean Linen'],
    hotspots: [
      { x: '30%', y: '55%', icon: '🛏️', title: 'Comfortable Bed', desc: 'Clean, comfortable bed with fresh linen daily.' },
      { x: '75%', y: '25%', icon: '🪟', title: 'Window', desc: 'Cross-ventilation with views of the serene surroundings.' },
      { x: '50%', y: '15%', icon: '🌀', title: 'Ceiling Fan', desc: 'Powerful ceiling fan for natural cooling comfort.' }
    ]
  },
  dorm: {
    name: 'Shared Dormitory', price: '₹500 / night',
    desc: 'Community living for fellow pilgrims. Safe, clean, and budget-friendly — perfect for groups of devotees.',
    interior: 'images/dormitory-interior.png',
    features: ['Bunk Beds', 'Shared Bath', 'Secure Lockers', 'Common Area', 'Free WiFi', '24/7 Reception'],
    hotspots: [
      { x: '25%', y: '45%', icon: '🛏️', title: 'Bunk Beds', desc: 'Sturdy bunk beds with personal reading lights.' },
      { x: '75%', y: '50%', icon: '🔐', title: 'Lockers', desc: 'Secure personal lockers for your valuables.' },
      { x: '50%', y: '80%', icon: '👥', title: 'Common Area', desc: 'Shared space for connecting with fellow pilgrims.' }
    ]
  }
};

// ── Touch device detection ──
var isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

function openDoorExperience(roomType) {
  var room = roomData[roomType];
  if (!room) return;

  var overlay = document.createElement('div');
  overlay.className = 'door-overlay'; overlay.id = 'doorOverlay';

  var hotspotHTML = '';
  room.hotspots.forEach(function (hs) {
    hotspotHTML += '<div class="room-hotspot" style="left:' + hs.x + ';top:' + hs.y + ';">' +
      hs.icon + '<div class="room-hotspot-tooltip"><h4>' + hs.title + '</h4><p>' + hs.desc + '</p></div></div>';
  });
  var featuresHTML = '';
  room.features.forEach(function (f) { featuresHTML += '<span class="room-interior-feature">' + f + '</span>'; });

  overlay.innerHTML =
    '<div class="door-scene"><div class="door-frame">' +
    '<div class="door-room-preview" style="background-image:url(' + room.interior + ')"></div>' +
    '<div class="door-rays"></div>' +
    '<div class="door-light-spill"></div>' +
    '<div class="door-panel-left"><div class="door-handle-left"></div></div>' +
    '<div class="door-panel-right"><div class="door-handle-right"></div></div>' +
    '<div class="room-interior-panel">' +
    '<div class="room-interior-header">' +
    '<div class="room-interior-title">' + room.name + '</div>' +
    '<button class="room-interior-close" onclick="closeDoorExperience()">✕</button>' +
    '</div>' +
    hotspotHTML +
    '<div class="room-interior-content">' +
    '<p class="room-interior-desc">' + room.desc + '<br><strong style="color:#D4AF37;font-size:18px;margin-top:6px;display:inline-block;">' + room.price + '</strong></p>' +
    '<div class="room-interior-features">' + featuresHTML + '</div>' +
    '<button class="room-interior-book" onclick="closeDoorExperience(); setTimeout(openModal, 400);">☎ Book This Room</button>' +
    '</div></div></div></div>';

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // ─── CINEMATIC 5-PHASE ANIMATION ───
  var tl = gsap.timeline();

  // Phase 1: Fade in dark overlay (0-0.5s)
  tl.to(overlay, { opacity: 1, duration: 0.6, onStart: function () { overlay.classList.add('active'); } });

  // Phase 2: Door frame enters with drama (0.3-1.0s)
  gsap.set(overlay.querySelector('.door-frame'), { scale: 0.8, opacity: 0 });
  tl.to(overlay.querySelector('.door-frame'), { scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(1.5)' }, 0.3);

  // Phase 3: Doors swing open (1.2-2.5s)
  tl.add(function () {
    overlay.querySelector('.door-panel-left').classList.add('open');
    overlay.querySelector('.door-panel-right').classList.add('open');
    overlay.querySelector('.door-light-spill').classList.add('active');
    overlay.querySelector('.door-rays').classList.add('active');
    overlay.querySelector('.door-room-preview').classList.add('revealed');
  }, 1.2);

  // Phase 4: Room preview zooms in (2.0s)
  tl.add(function () {
    overlay.querySelector('.door-room-preview').classList.add('zoom');
  }, 2.5);

  // Phase 5: Interior panel with details (2.5s)
  tl.add(function () {
    overlay.querySelector('.room-interior-panel').classList.add('active');
  }, 3.0);

  // Hotspots bounce in
  tl.from(overlay.querySelectorAll('.room-hotspot'), {
    scale: 0, opacity: 0, duration: 0.6, stagger: 0.2, ease: 'back.out(3)'
  }, 3.3);

  // Features slide in
  tl.from(overlay.querySelectorAll('.room-interior-feature'), {
    y: 20, opacity: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out'
  }, 3.5);
}

function closeDoorExperience() {
  var overlay = document.getElementById('doorOverlay');
  if (!overlay) return;
  var tl = gsap.timeline({ onComplete: function () {
    overlay.remove();
    document.body.style.overflow = '';
  } });
  tl.to(overlay.querySelector('.room-interior-panel'), { opacity: 0, duration: 0.3 });
  tl.to(overlay.querySelectorAll('.room-hotspot'), { scale: 0, opacity: 0, duration: 0.2, stagger: 0.05 }, 0);
  tl.add(function () {
    var lp = overlay.querySelector('.door-panel-left');
    var rp = overlay.querySelector('.door-panel-right');
    if (lp) lp.classList.remove('open');
    if (rp) rp.classList.remove('open');
    var ls = overlay.querySelector('.door-light-spill');
    if (ls) ls.classList.remove('active');
    var dr = overlay.querySelector('.door-rays');
    if (dr) dr.classList.remove('active');
    var pv = overlay.querySelector('.door-room-preview');
    if (pv) { pv.classList.remove('zoom'); pv.classList.remove('revealed'); }
  }, 0.4);
  tl.to(overlay.querySelector('.door-frame'), { scale: 0.85, opacity: 0, duration: 0.5, ease: 'power2.in' }, 1.0);
  tl.to(overlay, { opacity: 0, duration: 0.4 }, 1.3);
}

// Attach door animation to Enter Room buttons — subtle push only, no rotate/flip
document.querySelectorAll('.enter-room-btn').forEach(function (btn) {
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    var roomType = this.dataset.room;
    var card = this.closest('.room-card');

    // Subtle press → small lift → open door
    var tl = gsap.timeline();
    tl.to(card, { scale: 0.98, duration: 0.1, ease: 'power2.in' });
    tl.to(card, { scale: 1.02, y: -3, duration: 0.15, ease: 'power2.out',
      onComplete: function () { openDoorExperience(roomType); }
    });
    tl.to(card, { scale: 1, y: 0, duration: 0.3, ease: 'power3.out' }, 0.5);
  });
});

/* ═══════════════════════════════════════════════════════
   18. COUNTER ANIMATIONS
   ═══════════════════════════════════════════════════════ */
document.querySelectorAll('.stat-number').forEach(function (counter) {
  var raw = counter.dataset.count;
  var target = parseInt(raw);
  ScrollTrigger.create({ trigger: counter, start: 'top 90%', once: true,
    onEnter: function () {
      if (raw === '24') return;
      gsap.to(counter, { innerText: target, snap: { innerText: 1 }, duration: 2, ease: 'power3.out',
        onComplete: function () { if (target === 100) counter.textContent = '100+'; }
      });
    }
  });
});

/* ═══════════════════════════════════════════════════════
   19. SECTION REVEALS
   ═══════════════════════════════════════════════════════ */
gsap.utils.toArray('.sanctuary-grid > *').forEach(function (el) {
  gsap.from(el, { y: 60, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' } });
});
document.querySelectorAll('.amenity-card').forEach(function (el, i) {
  gsap.from(el, { y: 40, opacity: 0, scale: 0.9, rotateX: 15, duration: 0.7, ease: 'back.out(1.5)', delay: i * 0.1,
    scrollTrigger: { trigger: '.amenities-grid', start: 'top 85%', toggleActions: 'play none none none' }
  });
});
document.querySelectorAll('.gallery-item').forEach(function (el, i) {
  gsap.from(el, { clipPath: 'circle(0% at 50% 50%)', opacity: 0, scale: 0.9, duration: 0.8, ease: 'power3.out', delay: i * 0.12,
    scrollTrigger: { trigger: '.gallery-grid', start: 'top 85%', toggleActions: 'play none none none' }
  });
});
gsap.utils.toArray('.stat-card').forEach(function (el, i) {
  gsap.from(el, { y: 40, opacity: 0, duration: 0.6, ease: 'power2.out', delay: i * 0.12,
    scrollTrigger: { trigger: '.stats-grid', start: 'top 85%' }
  });
});
gsap.utils.toArray('.location-grid > *').forEach(function (el, i) {
  gsap.from(el, { y: 50, opacity: 0, duration: 0.8, ease: 'power3.out', delay: i * 0.2,
    scrollTrigger: { trigger: el, start: 'top 85%' }
  });
});
gsap.from('.contact-section .contact-inner > *', { y: 30, opacity: 0, duration: 0.6, ease: 'power2.out', stagger: 0.1,
  scrollTrigger: { trigger: '.contact-section', start: 'top 85%' }
});

/* ═══════════════════════════════════════════════════════
   20. SPLITTYPE TEXT REVEALS — Cinematic typography across sections
   Splits headings into chars + subtitles into words for staggered reveals
   ═══════════════════════════════════════════════════════ */
(function () {
  if (typeof SplitType === 'undefined') return;

  var splitTweens = [];
  var splitInstances = [];

  function initTextSplits() {
    // Revert any existing splits so elements return to raw text
    splitInstances.forEach(function (s) { s.revert(); });
    // Kill previous tweens & their scroll triggers
    splitTweens.forEach(function (t) {
      if (t.scrollTrigger) t.scrollTrigger.kill();
      t.kill();
    });
    splitInstances = [];
    splitTweens = [];

    // ── Section titles: character-level dramatic reveal ──
    document.querySelectorAll('.section-title').forEach(function (title) {
      var s = new SplitType(title, { types: 'chars' });
      splitInstances.push(s);
      var twn = gsap.from(s.chars, {
        opacity: 0, y: 50, rotateX: -80,
        stagger: 0.03, duration: 0.7,
        ease: 'back.out(1.5)', transformPerspective: 500,
        scrollTrigger: {
          trigger: title.closest('section') || title,
          start: 'top 85%',
          toggleActions: 'play none none reverse'
        }
      });
      splitTweens.push(twn);
    });

    // ── Section subtitles: word-level reveal for smoother reading ──
    document.querySelectorAll('.section-sub').forEach(function (sub) {
      var s = new SplitType(sub, { types: 'words' });
      splitInstances.push(s);
      var twn = gsap.from(s.words, {
        opacity: 0, y: 30, filter: 'blur(4px)',
        stagger: 0.04, duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: sub.closest('section') || sub,
          start: 'top 88%',
          toggleActions: 'play none none reverse'
        }
      });
      splitTweens.push(twn);
    });

    // ── Content headings inside sections ──
    // Note: .contact-section .section-title is already handled by the .section-title loop above
    var headingSelectors = [
      '.sanctuary-content h2',
      '.location-info h3'
    ];
    document.querySelectorAll(headingSelectors.join(',')).forEach(function (el) {
      var s = new SplitType(el, { types: 'chars' });
      splitInstances.push(s);
      var twn = gsap.from(s.chars, {
        opacity: 0, y: 40, rotateX: -60,
        stagger: 0.03, duration: 0.6,
        ease: 'back.out(1.4)', transformPerspective: 500,
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none reverse'
        }
      });
      splitTweens.push(twn);
    });
  }

  // Initialise on next frame so DOM is ready
  requestAnimationFrame(function () {
    initTextSplits();
  });

    // ── Debounced re-split on resize ──
  var resizeTimer;
  var lastWinW = window.innerWidth;
  window.addEventListener('resize', function () {
    var newW = window.innerWidth;
    // Only re-split if width crosses a breakpoint threshold to avoid unnecessary work
    var breakpoints = [360, 480, 600, 768, 820, 1024, 1440];
    var crossed = breakpoints.some(function (bp) {
      return (lastWinW < bp && newW >= bp) || (lastWinW >= bp && newW < bp);
    });
    lastWinW = newW;
    if (!crossed) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      initTextSplits();
      ScrollTrigger.refresh();
    }, 350);
  });
})();

/* 21. TESTIMONIAL CAROUSEL — GSAP-Powered Slide Animation */
(function () {
  var track = document.getElementById('testimonialsTrack');
  var dots = document.querySelectorAll('.testimonial-dot');
  var cards = document.querySelectorAll('.testimonial-card');
  if (!track || !dots.length || !cards.length) return;
  var current = 0, total = dots.length, autoplay, startX = 0;
  var wrap = track.parentElement;
  var isAnimating = false;

  // First card visible; others hidden by CSS
  gsap.set(cards[0], { clearProps: 'all' });

  function goTo(index) {
    if (isAnimating) return;
    index = ((index % total) + total) % total;
    if (index === current) return;
    isAnimating = true;

    var direction = index > current || (current === total - 1 && index === 0) ? 1 : -1;
    var outgoing = cards[current];
    var incoming = cards[index];

    gsap.killTweensOf([outgoing, incoming]);

    // Place incoming off-screen in the slide direction
    gsap.set(incoming, {
      x: direction * 100 + '%',
      opacity: 1,
      scale: 0.92,
      filter: 'blur(8px)',
      visibility: 'visible'
    });

    // Slide outgoing card away
    gsap.to(outgoing, {
      x: direction * -100 + '%',
      opacity: 0,
      scale: 0.88,
      filter: 'blur(10px)',
      duration: 0.5,
      ease: 'power2.in',
      onComplete: function () {
        gsap.set(outgoing, { visibility: 'hidden', clearProps: 'x,scale,filter,opacity' });
      }
    });

    // Slide incoming card in
    gsap.to(incoming, {
      x: 0,
      scale: 1,
      filter: 'blur(0px)',
      duration: 0.65,
      delay: 0.08,
      ease: 'power3.out',
      onComplete: function () {
        gsap.set(incoming, { clearProps: 'x,scale,filter,opacity' });
        current = index;
        isAnimating = false;
        updateDots();
      }
    });
  }

  var counterEl = document.getElementById('testimonialCounter');

  function updateDots() {
    dots.forEach(function (d, i) {
      d.classList.toggle('active', i === current);
    });
    if (counterEl) counterEl.textContent = (current + 1) + ' / ' + total;
  }

  // Dot click handlers
  dots.forEach(function (d) {
    d.addEventListener('click', function () {
      var idx = parseInt(this.dataset.index);
      if (idx === current) return;
      clearInterval(autoplay);
      goTo(idx);
      startAuto();
    });
  });

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function startAuto() {
    clearInterval(autoplay);
    autoplay = setInterval(next, 5000);
  }

  // Touch swipe detection
  wrap.addEventListener('touchstart', function (e) {
    startX = e.touches[0].clientX;
    clearInterval(autoplay);
  }, { passive: true });

  wrap.addEventListener('touchend', function (e) {
    var diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next(); else prev();
    }
    startAuto();
  }, { passive: true });

  // Pause on hover
  wrap.addEventListener('mouseenter', function () {
    clearInterval(autoplay);
  });
  wrap.addEventListener('mouseleave', startAuto);

  // Start autoplay
  startAuto();
})();

/* 22. GALLERY LIGHTBOX */
(function () {
  var items = document.querySelectorAll('.gallery-item');
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var counter = document.getElementById('lightboxCounter');
  var currentIndex = 0, images = [];

  items.forEach(function (item, i) {
    var img = item.querySelector('img');
    if (img) images.push({ src: img.src, alt: img.alt });
    item.addEventListener('click', function () { currentIndex = i; show(); lightbox.classList.add('open'); });
  });

  function show() {
    if (images[currentIndex]) { lightboxImg.src = images[currentIndex].src; lightboxImg.alt = images[currentIndex].alt; if (counter) counter.textContent = (currentIndex + 1) + ' / ' + images.length; }
  }

  var prev = document.getElementById('lightboxPrev');
  var next = document.getElementById('lightboxNext');
  if (prev) prev.addEventListener('click', function (e) { e.stopPropagation(); currentIndex = (currentIndex - 1 + images.length) % images.length; show(); });
  if (next) next.addEventListener('click', function (e) { e.stopPropagation(); currentIndex = (currentIndex + 1) % images.length; show(); });

  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'ArrowLeft') { currentIndex = (currentIndex - 1 + images.length) % images.length; show(); }
    if (e.key === 'ArrowRight') { currentIndex = (currentIndex + 1) % images.length; show(); }
  });
})();

function closeLightbox(e) { if (e.target === e.currentTarget || e.target.classList.contains('lightbox-close')) document.getElementById('lightbox').classList.remove('open'); }

/* 23-28: STICKY, WHATSAPP, MODAL, MENU, SCROLL, RIPPLE */
ScrollTrigger.create({ trigger: '#rooms', start: 'top 60%',
  onEnter: function () { document.getElementById('stickyBook').classList.add('visible'); },
  onLeaveBack: function () { document.getElementById('stickyBook').classList.remove('visible'); }
});
ScrollTrigger.create({ trigger: '#sanctuary', start: 'top 80%',
  onEnter: function () { document.getElementById('whatsappFloat').classList.add('visible'); },
  onLeaveBack: function () { document.getElementById('whatsappFloat').classList.remove('visible'); }
});

function openModal() { document.getElementById('modal').classList.add('open'); }
function closeModal() { document.getElementById('modal').classList.remove('open'); }
function closeModalOut(e) { if (e.target.id === 'modal') closeModal(); }
function openWhatsApp() { window.open('https://wa.me/91XXXXXXXXXX', '_blank'); }

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { closeModal(); document.getElementById('lightbox').classList.remove('open'); closeDoorExperience(); }
});

(function () {
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('mobileMenu');
  if (toggle && menu) toggle.addEventListener('click', function () { toggle.classList.toggle('active'); menu.classList.toggle('open'); });
})();
function closeMobileMenu() {
  var t = document.getElementById('navToggle'), m = document.getElementById('mobileMenu');
  if (t) t.classList.remove('active'); if (m) m.classList.remove('open');
}

document.querySelectorAll('a[href^="#"]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    e.preventDefault();
    var href = this.getAttribute('href');
    if (href && href.length > 1) safeScrollTo(href, 68);
  });
});

document.addEventListener('click', function (e) {
  var target = e.target.closest('button, a, .room-card, .gallery-item, .amenity-card');
  if (!target) return;
  var r = target.getBoundingClientRect();
  var ripple = document.createElement('span'); ripple.className = 'ripple';
  var size = Math.max(r.width, r.height);
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (e.clientX - r.left - size / 2) + 'px';
  ripple.style.top = (e.clientY - r.top - size / 2) + 'px';
  if (!target.style.position || target.style.position === 'static') target.style.position = 'relative';
  target.style.overflow = 'hidden';
  target.appendChild(ripple);
  setTimeout(function () { ripple.remove(); }, 700);
});

/* 29. JOURNEY */
(function () {
  var progress = document.getElementById('journeyProgress');
  var stops = document.querySelectorAll('.journey-stop');
  if (!progress) return;
  ScrollTrigger.create({ trigger: '.journey-section', start: 'top 70%', end: 'bottom 30%', scrub: true,
    onUpdate: function (self) { progress.style.width = (self.progress * 100) + '%'; }
  });
  stops.forEach(function (stop, i) {
    ScrollTrigger.create({ trigger: '.journey-section', start: 'top 70%', once: true,
      onEnter: function () { setTimeout(function () { stop.classList.add('revealed'); }, i * 200); }
    });
  });
})();

/* 30. GALLERY 3D TILT — disabled on touch devices */
(function () {
  var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (window.innerWidth < 768 || isTouch) return;
  document.querySelectorAll('.gallery-item').forEach(function (item) {
    item.addEventListener('mousemove', function (e) {
      var r = item.getBoundingClientRect();
      var rotX = (e.clientY - r.top - r.height / 2) / 18;
      var rotY = (r.width / 2 - (e.clientX - r.left)) / 18;
      gsap.to(item, { rotateX: rotX, rotateY: rotY, duration: 0.3, ease: 'power2.out', transformPerspective: 800 });
    });
    item.addEventListener('mouseleave', function () { gsap.to(item, { rotateX: 0, rotateY: 0, duration: 0.5, ease: 'power3.out' }); });
  });
})();

/* INIT */
window.addEventListener('load', function () { ScrollTrigger.refresh(); });
setTimeout(function () { ScrollTrigger.refresh(); }, 600);
