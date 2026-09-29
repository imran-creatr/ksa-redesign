/* KSA — motion layer (GSAP + ScrollTrigger + Lenis) */
(() => {
  gsap.registerPlugin(ScrollTrigger);

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = matchMedia('(hover: none)').matches;
  const EASE = 'expo.out';

  /* ------------------------------------------------------------------
     Smooth scroll
  ------------------------------------------------------------------ */
  let lenis = null;
  if (!reduce) {
    lenis = new Lenis({ duration: 1.25, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  const scrollTo = target => {
    if (lenis) lenis.scrollTo(target, { duration: 1.6, offset: 0 });
    else if (typeof target === 'number') window.scrollTo({ top: target }); else target.scrollIntoView();
  };

  /* ------------------------------------------------------------------
     Text splitting
  ------------------------------------------------------------------ */
  function splitLines(el) {
    const html = el.innerHTML.replace(/&nbsp;/g, ' ');
    const words = el.textContent.trim().split(/ +/);
    el.innerHTML = words.map(w => `<span class="w-tmp">${w}</span>`).join(' ');
    const lines = [];
    let top = null;
    $$('.w-tmp', el).forEach(w => {
      if (w.offsetTop !== top) { lines.push([]); top = w.offsetTop; }
      lines[lines.length - 1].push(w.textContent);
    });
    el.innerHTML = lines.map(l => `<span class="line-mask"><span>${l.join(' ')}</span></span>`).join('');
    el.dataset.html = html;
    return $$('.line-mask > span', el);
  }

  function splitChars(el) {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.innerHTML = [...text].map(c => c === ' ' ? ' ' : `<span class="ch" aria-hidden="true" style="display:inline-block">${c}</span>`).join('');
    return $$('.ch', el);
  }

  function splitWords(el) {
    el.innerHTML = el.textContent.trim().split(/ +/).map(w => `<span class="w">${w}</span>`).join(' ');
    return $$('.w', el);
  }

  /* ------------------------------------------------------------------
     Topographic pattern (reference's map blobs, regenerated per load)
  ------------------------------------------------------------------ */
  function topo(el) {
    const warm = el.dataset.topo === 'warm';
    const fills = warm
      ? ['#bfe6f8', '#0098da', '#0b3a66', '#5ccbf7', '#fdfeff', '#bfe6f8']
      : ['#fdfeff', '#bfe6f8', '#0b3a66', '#5ccbf7', '#fdfeff'];
    const W = 400, H = 400;
    let seed = Math.random() * 1000;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const blob = (cx, cy, r, amp, ph) => {
      let d = '';
      const n = 64;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rr = r * (1 + amp * (Math.sin(3 * a + ph) * .5 + Math.sin(5 * a + ph * 1.7) * .3 + Math.sin(2 * a - ph) * .4));
        d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1);
      }
      return d + 'Z';
    };
    let out = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><rect width="${W}" height="${H}" fill="${warm ? '#fdfeff' : '#bfe6f8'}"/>`;
    const centers = [[80, 90], [320, 60], [260, 300], [60, 330], [200, 180]];
    centers.forEach(([cx, cy], ci) => {
      const ph = rnd() * 6;
      const R = 110 + rnd() * 90;
      for (let k = 0; k < fills.length; k++) {
        const r = R * (1 - k / (fills.length + .6));
        out += `<path class="topo-l" d="${blob(cx, cy, r, .18 + rnd() * .12, ph + k * .35)}" fill="${fills[(k + ci) % fills.length]}" stroke="#101115" stroke-width="1.1"/>`;
      }
    });
    // dotted route
    out += `<path d="M20 200 C 120 150, 200 260, 380 170" fill="none" stroke="#101115" stroke-width="1" stroke-dasharray="3 5" opacity=".5"/>`;
    out += '</svg>';
    el.innerHTML = out;
    if (!reduce) {
      gsap.fromTo($$('.topo-l', el), { scale: .6, opacity: 0, transformOrigin: '50% 50%' }, {
        scale: 1, opacity: 1, duration: 1.8, ease: EASE, stagger: .025,
        scrollTrigger: { trigger: el, start: 'top 85%' }
      });
      gsap.to($('svg', el), { rotate: 8, scale: 1.12, ease: 'none', scrollTrigger: { trigger: el, scrub: true } });
    }
  }
  $$('[data-topo]').forEach(topo);

  /* ------------------------------------------------------------------
     Partners marquee content
  ------------------------------------------------------------------ */
  const partners = Array.from({ length: 20 }, (_, i) => `assets/pt${i + 1}.jpg`);
  $$('[data-marquee]').forEach((m, mi) => {
    const list = mi ? partners.slice(10).concat(partners.slice(0, 10)).reverse() : partners;
    const items = list.map(src => `<div class="marquee__item"><img src="${src}" alt="" loading="lazy"></div>`).join('');
    $('.marquee__inner', m).innerHTML = items + items;
  });

  /* ------------------------------------------------------------------
     Header behaviour
  ------------------------------------------------------------------ */
  const header = $('[data-header]');
  const darkSecs = $$('[data-theme="dark"]');
  let lastY = 0;
  function onScroll(y) {
    const probe = 40;
    const overDark = darkSecs.some(s => { const r = s.getBoundingClientRect(); return r.top <= probe && r.bottom >= probe; });
    header.classList.toggle('is-light', !overDark);
    header.classList.toggle('is-dark-bg', overDark && y > innerHeight * .8);
    if (!document.body.classList.contains('menu-open')) {
      header.classList.toggle('is-hidden', y > lastY && y > innerHeight * .6);
    }
    lastY = y;
  }
  if (lenis) lenis.on('scroll', e => onScroll(e.scroll));
  else addEventListener('scroll', () => onScroll(scrollY), { passive: true });

  /* menu */
  const burger = $('[data-burger]');
  burger.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    header.classList.remove('is-hidden');
    open ? lenis?.stop() : lenis?.start();
    if (open) gsap.fromTo('.menu__nav a', { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1, ease: EASE, stagger: .05, delay: .25 });
  });

  /* anchors */
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2 && id !== '#') return;
    const t = id === '#' ? null : $(id);
    if (!t) return;
    e.preventDefault();
    if (document.body.classList.contains('menu-open')) { document.body.classList.remove('menu-open'); lenis?.start(); }
    scrollTo(t);
  }));
  $('[data-top]').addEventListener('click', () => scrollTo(0));

  /* ------------------------------------------------------------------
     Lightbox
  ------------------------------------------------------------------ */
  const lb = $('[data-lb]');
  const closeLb = () => { gsap.to(lb, { opacity: 0, duration: .4, onComplete: () => { lb.hidden = true; lenis?.start(); } }); };
  $$('[data-lightbox]').forEach(b => b.addEventListener('click', () => {
    $('img', lb).src = b.dataset.lightbox;
    lb.hidden = false; lenis?.stop();
    gsap.fromTo(lb, { opacity: 0 }, { opacity: 1, duration: .4 });
    gsap.fromTo($('img', lb), { scale: .9, y: 30 }, { scale: 1, y: 0, duration: .9, ease: EASE });
  }));
  lb.addEventListener('click', closeLb);
  addEventListener('keydown', e => e.key === 'Escape' && !lb.hidden && closeLb());

  /* ------------------------------------------------------------------
     FAQ — animated details
  ------------------------------------------------------------------ */
  $$('.acc__item').forEach(d => {
    const s = $('summary', d), a = $('.acc__a', d);
    s.addEventListener('click', e => {
      e.preventDefault();
      if (d.open) {
        gsap.to(a, { height: 0, duration: .6, ease: 'expo.inOut', onComplete: () => { d.open = false; ScrollTrigger.refresh(); } });
      } else {
        $$('.acc__item[open]').forEach(o => o !== d && $('summary', o).click());
        d.open = true;
        gsap.fromTo(a, { height: 0 }, { height: 'auto', duration: .8, ease: 'expo.inOut', onComplete: () => ScrollTrigger.refresh() });
        gsap.fromTo($('p', a), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .8, delay: .15, ease: EASE });
      }
    });
  });

  /* ------------------------------------------------------------------
     Presidents drag slider
  ------------------------------------------------------------------ */
  (() => {
    const wrap = $('[data-drag]'), track = $('.pres__track', wrap), bar = $('[data-pres-progress]');
    let x = 0, max = 0, start = 0, sx = 0, down = false, moved = 0;
    const setX = gsap.quickTo(track, 'x', { duration: .9, ease: 'power3.out' });
    const measure = () => { max = Math.max(0, track.scrollWidth - wrap.clientWidth + parseFloat(getComputedStyle(wrap).paddingLeft) * 2); };
    const apply = v => {
      x = gsap.utils.clamp(-max, 0, v); setX(x);
      const p = max ? -x / max : 0;
      gsap.to(bar, { left: `${p * 80}%`, duration: .9, ease: 'power3.out' });
    };
    measure(); addEventListener('resize', () => { measure(); apply(x); });
    wrap.addEventListener('pointerdown', e => { down = true; moved = 0; sx = e.clientX; start = x; wrap.classList.add('is-drag'); });
    addEventListener('pointermove', e => { if (!down) return; moved = e.clientX - sx; apply(start + moved * 1.2); });
    addEventListener('pointerup', () => { down = false; wrap.classList.remove('is-drag'); });
    const step = () => $('.pres__card', track).offsetWidth + 20;
    $('[data-next]').addEventListener('click', () => apply(x - step()));
    $('[data-prev]').addEventListener('click', () => apply(x + step()));
    // horizontal wheel / trackpad
    wrap.addEventListener('wheel', e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); apply(x - e.deltaX); } }, { passive: false });
  })();


  /* ------------------------------------------------------------------
     Goals — «frontiers» tabs (after anveril.com):
     · desktop/tablet: section pins, scroll steps through the tabs, pills show progress
     · phone: no pin, tabs auto-advance
     · at rest the real photo shows; while scrolling it dissolves into a halftone
     · title fills char-by-char from 12% ink, body chars rise 10px
  ------------------------------------------------------------------ */
  function initFrontiers() {
    const root = $('[data-frontiers]');
    if (!root) return;
    const tabs = $$('.fr__tab', root), bars = $$('.fr__bars i', root), fills = $$('.fr__bars b', root);
    const title = $('.fr__title', root), text = $('.fr__text', root), num = $('.fr__num', root);
    const photos = $$('.fr__photo', root);
    const data = $$('div', $('.fr__data', root).content).map(d => ({ ...d.dataset }));
    const N = data.length;
    const canvas = $('.fr__canvas', root), ctx = canvas.getContext('2d');
    const DUR = 6.5;
    const pinMode = !reduce && matchMedia('(min-width: 641px)').matches;
    let idx = -1, barTween = null, textTl = null, visible = false, pinST = null, front = 0;

    const chars = (str, cls) => str.split(' ').map(w =>
      `<span class="wd">${[...w].map(c => `<span class="${cls}">${c}</span>`).join('')}</span>`).join(' ');

    /* ---- halftone canvas ---- */
    const STEP = 9;
    let W = 0, H = 0, cols = 0, rows = 0, from = [], to = [], cur = [], t0 = 0, tDur = 1.2;
    let vel = 0, pix = 0;                       // scroll velocity → pixel amount (0 = photo, 1 = dots)
    const mouse = { x: -999, y: -999 };
    const imgs = data.map(d => { const i = new Image(); i.src = d.img; return i; });
    const sampler = document.createElement('canvas'), sctx = sampler.getContext('2d', { willReadFrequently: true });

    function size() {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(W / STEP); rows = Math.ceil(H / STEP);
      const n = cols * rows;
      if (cur.length !== n) { cur = new Float32Array(n); from = new Float32Array(n); to = new Float32Array(n); }
      if (idx >= 0) { sample(idx, to); cur.set(to); from.set(to); }
    }
    function sample(i, out) {
      const img = imgs[i];
      if (!img.complete || !img.naturalWidth) { img.onload = () => i === idx && morphTo(i); return; }
      sampler.width = cols; sampler.height = rows;
      const s = Math.max(cols / img.naturalWidth, rows / img.naturalHeight);   // object-fit: cover
      const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
      sctx.drawImage(img, (cols - dw) / 2, (rows - dh) / 2, dw, dh);
      const px = sctx.getImageData(0, 0, cols, rows).data;
      for (let k = 0; k < cols * rows; k++) {
        const l = (px[k * 4] * .299 + px[k * 4 + 1] * .587 + px[k * 4 + 2] * .114) / 255;
        out[k] = Math.pow(1 - l, 1.15);
      }
    }
    function morphTo(i) { from.set(cur); sample(i, to); t0 = performance.now(); }
    const ease = x => 1 - Math.pow(1 - x, 3);
    function draw(now) {
      const t = (now - t0) / 1000 / tDur;
      ctx.clearRect(0, 0, W, H);
      const time = now / 1000, maxR = STEP * .56;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const k = y * cols + x;
        const d = (x / cols + y / rows) / 2;                         // diagonal wave
        const p = ease(Math.min(1, Math.max(0, t * 1.7 - d * .7)));
        const v = from[k] + (to[k] - from[k]) * p;
        cur[k] = v;
        const cx = x * STEP + STEP / 2, cy = y * STEP + STEP / 2;
        const md = Math.hypot(cx - mouse.x, cy - mouse.y);
        const push = md < 90 ? (1 - md / 90) : 0;
        const r = maxR * v * (1 + .05 * Math.sin(time * 1.4 + x * .35 + y * .22)) * (1 + push * .9);
        if (r < .35) continue;
        ctx.fillStyle = v > .62 ? '#0b3a66' : '#0098da';
        ctx.beginPath(); ctx.arc(cx, cy, Math.min(r, maxR * 1.25), 0, Math.PI * 2); ctx.fill();
      }
    }
    function loop(now) {
      if (visible && W) {
        const target = Math.min(1, Math.abs(vel) / 5);
        pix += (target - pix) * (target > pix ? .22 : .045);          // fast in, slow settle back to photo
        vel *= .88;
        if (pix < .004) pix = 0;
        canvas.style.opacity = pix.toFixed(3);
        if (pix > 0) draw(now);
      }
      requestAnimationFrame(loop);
    }
    if (lenis) lenis.on('scroll', e => { vel = e.velocity; });
    else addEventListener('scroll', () => { vel = 12; }, { passive: true });
    canvas.parentElement.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    canvas.parentElement.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });

    /* ---- photo crossfade ---- */
    function showPhoto(i) {
      const next = photos[1 - front];
      next.src = data[i].img;
      const swap = () => { photos[front].classList.remove('is-on'); next.classList.add('is-on'); front = 1 - front; };
      next.complete ? swap() : (next.onload = swap);
    }

    /* ---- copy ---- */
    function setCopy(d) {
      title.innerHTML = chars(d.title, 'c'); title.setAttribute('aria-label', d.title);
      text.innerHTML = chars(d.text, 'c');
      if (reduce) { gsap.set($$('.c', title), { color: '#101115' }); return; }
      textTl = gsap.timeline()
        .to($$('.c', title), { color: '#101115', duration: .5, ease: 'none', stagger: .018 })
        .fromTo($$('.c', text), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .7, ease: 'power3.out', stagger: .006 }, .25);
    }

    function go(i) {
      if (i === idx) return;
      const first = idx < 0;
      idx = i;
      tabs.forEach((t, k) => { t.classList.toggle('is-active', k === i); t.setAttribute('aria-selected', k === i); });
      bars.forEach((b, k) => b.classList.toggle('is-active', k === i));
      num.textContent = `${String(i + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
      if (!first) { showPhoto(i); morphTo(i); }
      textTl?.kill();
      if (reduce || first) setCopy(data[i]);
      else gsap.to([title, text], { opacity: 0, y: -8, duration: .3, ease: 'power2.in', overwrite: true, onComplete: () => { gsap.set([title, text], { opacity: 1, y: 0 }); setCopy(data[i]); } });
      if (!pinMode && !reduce) {                                     // phone: timed auto-advance
        barTween?.kill();
        gsap.set(fills, { scaleY: 0 });
        barTween = gsap.to(fills[i], { scaleY: 1, duration: DUR, ease: 'none', paused: !visible, onComplete: () => go((idx + 1) % N) });
      }
    }

    tabs.forEach((t, k) => t.addEventListener('click', () => {
      if (pinST) scrollTo(pinST.start + (pinST.end - pinST.start) * (k + .5) / N);   // jump to that tab's scroll segment
      else go(k);
    }));

    size(); addEventListener('resize', size);
    go(0);
    sample(0, to); cur.set(to); from.set(to);
    requestAnimationFrame(loop);

    if (pinMode) {
      pinST = ScrollTrigger.create({
        trigger: root, start: 'top top', end: () => `+=${innerHeight * N}`, pin: true, anticipatePin: 1,
        onUpdate: self => {
          const f = self.progress * N, i = Math.min(N - 1, Math.floor(f));
          go(i);
          fills.forEach((b, k) => gsap.set(b, { scaleY: k < i ? 1 : k === i ? Math.min(1, f - i) : 0 }));
        }
      });
    }
    ScrollTrigger.create({
      trigger: root, start: 'top bottom', end: () => pinST ? pinST.end + innerHeight : 'bottom top',
      onToggle: self => {
        visible = self.isActive; visible ? barTween?.resume() : barTween?.pause();
        if (!visible) { pix = 0; canvas.style.opacity = 0; }
      }
    });
    if (!reduce) {
      gsap.from($$('.fr__tabs li', root), { x: -30, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: .07, scrollTrigger: { trigger: root, start: 'top 80%' } });
      gsap.from($('.fr__visual', root), { clipPath: 'inset(100% 0 0 0)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: root, start: 'top 80%', onEnter: () => { textTl?.kill(); setCopy(data[idx]); } } });
    }
  }

  /* ------------------------------------------------------------------
     Everything below is motion — skipped for reduced motion
  ------------------------------------------------------------------ */
  function reveal() {
    if (reduce) {
      $$('[data-count]').forEach(n => n.textContent = n.dataset.count);
      $$('.preloader').forEach(p => p.remove());
      document.body.classList.remove('is-loading');
      initFrontiers();
      return;
    }

    /* ---------- split & prepare ---------- */
    const heroTitleLines = splitLines($('.hero__title'));
    const heroSub = splitLines($('.hero__sub span'));
    gsap.set('.hero__mark', { overflow: 'hidden', paddingTop: '.08em' });
    gsap.set('.hm-g', { yPercent: 110 });
    gsap.set([heroTitleLines, heroSub], { yPercent: 110 });
    gsap.set('.hero [data-fade]', { opacity: 0, y: 20 });
    gsap.set('.hero .gridlines i', { scaleY: 0 });
    gsap.set('.hero__media img', { scale: 1.35 });

    /* ---------- preloader ---------- */
    const count = $('.preloader__count b');
    const cnt = { v: 0 };
    const tl = gsap.timeline({ defaults: { ease: EASE } });
    tl.from('.pl-g', { yPercent: 120, opacity: 0, duration: 1.2, stagger: .08 })
      .to(cnt, { v: 100, duration: 1.6, ease: 'power2.inOut', onUpdate: () => count.textContent = Math.round(cnt.v) }, 0)
      .to('.pl-g', { yPercent: -120, opacity: 0, duration: .8, stagger: .05, ease: 'expo.in' }, 1.7)
      .to('.preloader', { clipPath: 'inset(0 0 100% 0)', duration: 1.2, ease: 'expo.inOut' }, 2.2)
      .add(() => { document.body.classList.remove('is-loading'); lenis?.start(); $('.preloader').remove(); }, 3.4)
      // hero intro
      .to('.hero__media img', { scale: 1.08, duration: 2.6, ease: 'expo.out' }, 2.3)
      .to('.hero .gridlines i', { scaleY: 1, duration: 1.6, stagger: .1, ease: 'expo.inOut' }, 2.4)
      .to('.hm-g', { yPercent: 0, duration: 1.6, stagger: .07 }, 2.7)
      .to(heroSub, { yPercent: 0, duration: 1.2 }, 3.0)
      .to(heroTitleLines, { yPercent: 0, duration: 1.4, stagger: .09 }, 3.05)
      .to('.hero [data-fade]', { opacity: 1, y: 0, duration: 1.2, stagger: .08 }, 3.3);

    // slow breathing zoom on hero image (video-like)
    gsap.to('.hero__media', { scale: 1.06, duration: 14, ease: 'sine.inOut', yoyo: true, repeat: -1 });

    // hero out on scroll
    gsap.to('.hero__media img', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__mark', { yPercent: -35, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to(['.hero__bottom', '.hero__sub'], { y: -80, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '10% top', end: '70% top', scrub: true } });

    /* ---------- generic line reveals ---------- */
    $$('[data-reveal-lines]').forEach(el => {
      if (el.closest('.hero')) return;
      const lines = splitLines(el);
      gsap.from(lines, { yPercent: 110, duration: 1.4, ease: EASE, stagger: .08, scrollTrigger: { trigger: el, start: 'top 88%' } });
    });

    /* ---------- fades ---------- */
    $$('[data-fade]').forEach(el => {
      if (el.closest('.hero')) return;
      gsap.from(el, { y: 40, opacity: 0, duration: 1.3, ease: EASE, scrollTrigger: { trigger: el, start: 'top 92%' } });
    });

    /* ---------- big headings: char fill on scroll (reference "Benefits"/"Contact") ---------- */
    $$('[data-fill]').forEach(el => {
      const light = el.hasAttribute('data-fill-light');
      const chars = splitChars(el);
      gsap.set(chars, { color: light ? 'rgba(253,254,255,.18)' : 'rgba(16,17,21,.14)' });
      gsap.from(chars, { yPercent: 40, opacity: 0, duration: 1.2, ease: EASE, stagger: .03, scrollTrigger: { trigger: el, start: 'top 92%' } });
      gsap.to(chars, {
        color: light ? '#fdfeff' : '#101115', stagger: .1, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 85%', end: 'top 35%', scrub: true }
      });
    });

    /* ---------- quote: word fill ---------- */
    $$('[data-fill-words]').forEach(el => {
      const words = splitWords(el);
      gsap.to(words, { color: '#101115', stagger: .1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true } });
    });

    /* ---------- parallax images ---------- */
    $$('[data-parallax]').forEach(img => {
      const amt = parseFloat(img.dataset.parallax);
      gsap.fromTo(img, { yPercent: -amt }, { yPercent: amt, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    /* ---------- image clip reveals ---------- */
    ['.about__portrait', '.band__img', '.cert img'].forEach(sel => $$(sel).forEach((el, i) => {
      gsap.fromTo(el, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.6, ease: 'expo.inOut', delay: sel === '.cert img' ? (i % 4) * .08 : 0, scrollTrigger: { trigger: el, start: 'top 88%' } });
    }));

    /* ---------- counters ---------- */
    $$('[data-count]').forEach(n => {
      const to = +n.dataset.count, o = { v: 0 };
      gsap.to(o, { v: to, duration: 2.4, ease: 'expo.out', scrollTrigger: { trigger: n, start: 'top 90%' }, onUpdate: () => n.textContent = Math.round(o.v) });
    });
    gsap.from('.stats .stat', { y: 60, opacity: 0, duration: 1.4, ease: EASE, stagger: .1, scrollTrigger: { trigger: '.stats', start: 'top 85%' } });

    /* ---------- EVENTS: pinned full-screen slider ---------- */
    (() => {
      const sec = $('.events'), slides = $$('.ev', sec), n = slides.length;
      const marker = $('.ruler__marker', sec), mlabel = $('span', marker);
      const pieces = s => [$('.ev__title', s), $('.ev__spec', s), $('.ev__top', s), $('.ev__desc', s)];
      slides.forEach((s, i) => { if (i) gsap.set(pieces(s), { y: 60, opacity: 0 }); });

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: sec, start: 'top top', end: () => `+=${innerHeight * (n - .3)}`, pin: '.events__pin', scrub: 1,
          onUpdate: self => {
            gsap.set(marker, { left: `${self.progress * 100}%` });
            mlabel.textContent = String(Math.min(n, Math.floor(self.progress * (n - .001)) + 1)).padStart(2, '0');
          }
        }
      });
      slides.forEach((s, i) => {
        if (!i) return;
        const prev = slides[i - 1], at = i - 1 + .15;
        tl.to(pieces(prev), { y: -60, opacity: 0, duration: .35, stagger: .03 }, at)
          .to($('.ev__media img', prev), { scale: 1.3, yPercent: -8, duration: .8 }, at)
          .to(s, { clipPath: 'inset(0% 0 0 0)', duration: .8, ease: 'power2.inOut' }, at)
          .fromTo($('.ev__media img', s), { scale: 1.4, yPercent: 10 }, { scale: 1.15, yPercent: 0, duration: .8 }, at)
          .to(pieces(s), { y: 0, opacity: 1, duration: .4, stagger: .05 }, at + .45);
      });
      tl.to({}, { duration: .3 });

      // first slide entrance
      gsap.from(pieces(slides[0]), { y: 60, opacity: 0, duration: 1.4, ease: EASE, stagger: .08, scrollTrigger: { trigger: sec, start: 'top 60%' } });
      gsap.from($('.ev__media img', slides[0]), { scale: 1.5, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top top', scrub: true } });
      gsap.from($$('.gridlines i', sec), { scaleY: 0, duration: 1.6, stagger: .1, ease: 'expo.inOut', scrollTrigger: { trigger: sec, start: 'top 60%' } });
      gsap.from('.events__tab', { xPercent: 100, duration: 1.2, ease: EASE, scrollTrigger: { trigger: sec, start: 'top 40%' } });
    })();

    /* ---------- goals «frontiers» — created after the pins above so its trigger positions include their spacing ---------- */
    initFrontiers();

    /* ---------- cards ---------- */
    gsap.from('[data-card]', { y: 80, opacity: 0, duration: 1.4, ease: EASE, stagger: .1, scrollTrigger: { trigger: '.cards', start: 'top 85%' } });
    gsap.from('.card__ico', { scale: 0, rotate: -90, duration: 1.4, ease: 'back.out(1.6)', stagger: .1, scrollTrigger: { trigger: '.cards', start: 'top 85%' } });

    /* ---------- presidents entrance ---------- */
    gsap.from('.pres__card', { x: 120, opacity: 0, duration: 1.6, ease: EASE, stagger: .07, scrollTrigger: { trigger: '.pres', start: 'top 85%' } });

    /* ---------- gallery: horizontal pin ---------- */
    (() => {
      const sec = $('.gallery'), track = $('.gallery__track', sec);
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const tween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top top', end: () => `+=${dist()}`, pin: '.gallery__pin', scrub: 1, invalidateOnRefresh: true }
      });
      $$('.g img', track).forEach(img => {
        gsap.fromTo(img, { xPercent: -8 }, { xPercent: 8, ease: 'none', scrollTrigger: { trigger: img.parentElement, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      });
      $$('.g', track).forEach(g => {
        gsap.from(g, { clipPath: 'inset(0 0 0 100%)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: g, containerAnimation: tween, start: 'left 95%' } });
      });
      const title = $('.gallery__head .big', sec);
      const ch = splitChars(title);
      gsap.from(ch, { yPercent: 100, opacity: 0, duration: 1.2, ease: EASE, stagger: .03, scrollTrigger: { trigger: sec, start: 'top 60%' } });
    })();

    /* ---------- marquee with scroll velocity ---------- */
    $$('[data-marquee]').forEach(m => {
      const inner = $('.marquee__inner', m), dir = +m.dataset.marquee;
      let x = 0, boost = 0;
      if (lenis) lenis.on('scroll', e => { boost = gsap.utils.clamp(-18, 18, e.velocity); });
      gsap.ticker.add(() => {
        const half = inner.scrollWidth / 2;
        x -= (0.5 + Math.abs(boost) * .35) * dir * (boost < 0 ? -1 : 1);
        boost *= .92;
        if (x <= -half) x += half;
        if (x > 0) x -= half;
        inner.style.transform = `translate3d(${x}px,0,0)`;
      });
    });

    /* ---------- contact / footer ---------- */
    gsap.from('.contact__list > div', { y: 30, opacity: 0, duration: 1.2, ease: EASE, stagger: .08, scrollTrigger: { trigger: '.contact__list', start: 'top 90%' } });
    gsap.from('.contact .gridlines i', { scaleY: 0, duration: 1.6, stagger: .1, ease: 'expo.inOut', scrollTrigger: { trigger: '.contact', start: 'top 60%' } });
    gsap.from('.footer__word span', { yPercent: 100, ease: 'none', stagger: .06, scrollTrigger: { trigger: '.footer__word', start: 'top bottom', end: 'bottom bottom', scrub: true } });

    /* ---------- emblem rotation ---------- */
    gsap.to('.emblem svg', { rotate: 720, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: .5 } });

    /* ---------- magnetic pills / arrows ---------- */
    if (!isTouch) $$('.pill, .arrow, .burger').forEach(b => {
      const qx = gsap.quickTo(b, 'x', { duration: .6, ease: 'power3.out' }), qy = gsap.quickTo(b, 'y', { duration: .6, ease: 'power3.out' });
      b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); qx((e.clientX - r.left - r.width / 2) * .25); qy((e.clientY - r.top - r.height / 2) * .35); });
      b.addEventListener('pointerleave', () => { qx(0); qy(0); });
    });

    // refresh in page order, so every trigger below a pin accounts for its spacer
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  }

  (document.fonts?.ready || Promise.resolve()).then(() => requestAnimationFrame(reveal));
})();
