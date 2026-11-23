/* Café de Paris — site.js: doorlopende systemen (Bladgoud-koppen, Spiegelschrift, header «Festoen», menu «Dubbele deur»,
   overgang «Luifel», cursor «Glans», PARIS-footer met lampen) + per-sectie technieken volgens _notes/SECTIONS.md. Vereist motion-kit. */
import { MK } from '../vendor/motion-kit.js';
const g = window.gsap, ST = window.ScrollTrigger;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOB = matchMedia('(max-width:760px)').matches;
const HOVER = matchMedia('(hover:hover)').matches;
const SOFT = 'power2.inOut', OUT = 'expo.out';
window.__site = true;
if (RM) document.documentElement.classList.add('rm');

/* ---------- 1. video desktop/mobile + scrubber ---------- */
const loadV = v => { if (v.src) return; v.src = (MOB && v.dataset.srcM) ? v.dataset.srcM : v.dataset.src; v.preload = 'auto';
  if (v.dataset.v === 'loop') { if (RM) v.removeAttribute('autoplay'); else v.play().catch(() => {}); } else v.pause(); };
const vio = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { loadV(e.target); vio.unobserve(e.target); } }), { rootMargin: '150% 0px' }) : null;
$$('video[data-src]').forEach(v => { if (!vio || v.getBoundingClientRect().top < innerHeight * 1.2) loadV(v); else vio.observe(v); });
function scrubber(v) { let want = 0, busy = false;
  const go = () => { busy = false; if (!v.duration) return; const t = want * (v.duration - 0.06); if (Math.abs(v.currentTime - t) > 0.01) v.currentTime = t; };
  v.addEventListener('loadedmetadata', go);
  return p => { want = Math.min(1, Math.max(0, p)); if (!busy) { busy = true; requestAnimationFrame(go); } }; }

/* ---------- 2. motion-kit ---------- */
g.registerPlugin(...[window.DrawSVGPlugin, window.ScrambleTextPlugin].filter(Boolean));
MK.init({ three: false });

/* ---------- 3. overgang «Luifel»: een gestreepte luifel rolt neer en weer op ---------- */
(() => { const c = $('.mk-curtain'); if (!c) return; const a = $('.awn', c), lg = $('.clogo', c);
  g.killTweensOf(c); g.set(c, { yPercent: 0 });
  if (RM) { g.set(c, { display: 'none' }); return; }
  g.timeline({ delay: 0.1 })
    .to(lg, { opacity: 0, scale: 0.92, duration: 0.3 }, 0)
    .to(a, { yPercent: -104, duration: 0.95, ease: 'power3.inOut' }, 0.15)
    .to(a, { scaleY: 0.97, duration: 0.12, ease: 'steps(2)', yoyo: true, repeat: 1, transformOrigin: '50% 0%' }, 0.15)
    .set(c, { visibility: 'hidden' });
  addEventListener('click', e => { const el = e.target.closest && e.target.closest('a[href]'); if (!el) return;
    const h = el.getAttribute('href'); if (!h || h.startsWith('#') || /^(https?:|tel:|mailto:)/.test(h) || el.target || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault(); e.stopPropagation();
    g.set(c, { visibility: 'visible' }); g.set(lg, { opacity: 0, scale: 0.92 });
    g.timeline()
      .fromTo(a, { yPercent: -104 }, { yPercent: 0, duration: 0.7, ease: 'power3.out' })
      .to(a, { scaleY: 1.015, duration: 0.1, ease: 'steps(2)', yoyo: true, repeat: 3, transformOrigin: '50% 0%' }, 0.55)
      .to(lg, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' }, 0.45)
      .add(() => { location.href = h; }, 0.85); }, true);
  addEventListener('pageshow', e => { if (e.persisted) g.set(c, { visibility: 'hidden' }); });
})();

/* ---------- 4. Bladgoud (signature): spiegelschrift → draait om → goudglans ---------- */
function goud(el, { delay = 0, loop = false } = {}) {
  const sw = document.createElement('span'); sw.className = 'gsw'; sw.setAttribute('aria-hidden', 'true'); sw.innerHTML = el.innerHTML; el.append(sw);
  if (RM) { el.classList.add('gdone'); return; }
  g.set(el, { rotateY: 180, opacity: 0.35, transformPerspective: 1600 });
  const tl = g.timeline({ paused: true, delay, onStart: () => el.classList.add('gdone') })
    .to(el, { rotateY: 0, opacity: 1, duration: 1.4, ease: 'power3.inOut' })
    .fromTo(sw, { backgroundPosition: '120% 0' }, { backgroundPosition: '-30% 0', duration: 1.3, ease: 'power1.inOut' }, 0.9);
  if (loop) { tl.eventCallback('onComplete', () => g.timeline({ repeat: -1, repeatDelay: 1.6 })
      .to(el, { rotateY: 180, opacity: 0.45, duration: 1.1, ease: SOFT, delay: 1.6 }).to(el, { rotateY: 0, opacity: 1, duration: 1.1, ease: SOFT, delay: 0.6 })
      .fromTo(sw, { backgroundPosition: '120% 0' }, { backgroundPosition: '-30% 0', duration: 1.2 }, '-=0.3')); }
  if (el.closest('.hero, .kh, .rh, .chero, .e404')) tl.play();
  else ST.create({ trigger: el, start: 'top 86%', once: true, onEnter: () => tl.play() });
}
$$('.goud').forEach(el => goud(el, { delay: el.closest('.hero, .kh, .rh, .chero, .e404') ? 0.9 : 0, loop: el.classList.contains('loopg') }));

/* ---------- 5. header «Festoen»: de luifel-schulpen kleuren goud mee met de pagina ---------- */
(() => { const hd = $('.hd'), fs = $$('.festoen .fs i'), hp = $('.hprog'), cta = $('.ctabar'); let last = 0, lastN = -1, lastF = -1;
  ST.create({ start: 0, end: 'max', onUpdate: s => { const y = scrollY;
    hd.classList.toggle('hide', y > 500 && y > last && !document.body.classList.contains('menu-open')); last = y;
    cta && cta.classList.toggle('on', y > 300);
    const f = Math.round(s.progress * fs.length); if (f !== lastF) { lastF = f; fs.forEach((i, k) => i.classList.toggle('on', k < f)); }
    const n = Math.min(4, Math.floor(s.progress * 5)); if (n !== lastN) { lastN = n; if (hp) { if (RM) hp.textContent = `TAFEL 0${n + 1} / 05`; else g.to(hp, { duration: 0.5, overwrite: true, scrambleText: { text: `TAFEL 0${n + 1} / 05`, chars: '012345', speed: 0.8 } }); } } } });
})();

/* ---------- 6. menu «Dubbele deur»: twee groene deuren zwaaien open ---------- */
(() => { const b = $('.burger'), m = $('#mnav'); if (!b || !m) return; const links = $$('a.big', m);
  const tl = g.timeline({ paused: true })
    .set(m, { visibility: 'visible' })
    .fromTo(m, { opacity: 0 }, { opacity: 1, duration: 0.2 })
    .fromTo('.mnav .dl', { rotateY: 0 }, { rotateY: -104, duration: 1, ease: 'power3.inOut' }, 0.15)
    .fromTo('.mnav .dr', { rotateY: 0 }, { rotateY: 104, duration: 1, ease: 'power3.inOut' }, 0.15)
    .from(links, { rotateY: 180, opacity: 0.2, transformPerspective: 900, duration: 0.9, ease: 'power3.out', stagger: 0.07 }, 0.45)
    .from($$('.row, .mm', m), { opacity: 0, y: 16, duration: 0.4 }, 0.8);
  const open = () => { tl.timeScale(1).play(); document.body.classList.add('menu-open'); b.setAttribute('aria-expanded', 'true'); MK.lenis?.stop(); $('.mnav-close', m).focus(); };
  const close = () => { tl.timeScale(1.8).reverse(); document.body.classList.remove('menu-open'); b.setAttribute('aria-expanded', 'false'); MK.lenis?.start(); b.focus(); };
  b.addEventListener('click', open); $('.mnav-close', m).addEventListener('click', close);
  addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) close(); });
})();

/* ---------- 7. tilt-glans ---------- */
if (HOVER) $$('[data-tilt]').forEach(c => { const gl = $('.glint', c); if (!gl) return;
  c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); gl.style.setProperty('--gl', ((e.clientX - r.left) / r.width * 160 - 30) + '%'); }); });

/* ---------- 8. footer PARIS: spiegelt om, vergult, lampen gaan aan ---------- */
(() => { const w = $('.ft .giant .w'); if (!w) return;
  const fit = () => { const box = w.parentElement, cs = getComputedStyle(box), avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    w.style.fontSize = '100px'; w.style.width = 'max-content'; const m = w.offsetWidth; w.style.width = ''; w.style.fontSize = (100 * avail / m * 0.97) + 'px'; };
  fit(); document.fonts?.ready.then(fit); addEventListener('resize', fit);
  const lamps = $$('.lamps i');
  if (RM) { lamps.forEach(l => l.classList.add('lit')); return; }
  g.timeline({ scrollTrigger: { trigger: '.ft', start: 'top 85%', end: 'bottom bottom', scrub: 1,
      onUpdate: s => lamps.forEach((l, i) => l.classList.toggle('lit', s.progress > 0.12 + i * 0.13)) } })
    .fromTo(w, { rotateY: 180, opacity: 0.4 }, { rotateY: 0, opacity: 1, ease: 'power2.inOut', duration: 1 }, 0)
    .fromTo($$('span', w), { '--gp': '110%' }, { '--gp': '-10%', ease: 'none', duration: 1, stagger: 0.05 }, 0.5);
})();

/* =============================== INDEX =============================== */
(() => { const sec = $('#hero'); if (!sec) return;
  const v = $('video', sec), sc = scrubber(v), s = $$('.state', sec), tp = $('.tprog', sec), lt = $('.lt', sec);
  if (RM) return;
  let idle = true; v.loop = true; v.playbackRate = 0.5;
  const tryPlay = () => { if (idle && scrollY < 8) v.play().catch(() => {}); };
  v.addEventListener('loadeddata', tryPlay); tryPlay();
  g.fromTo('.hero .stage', { scale: 1.02 }, { scale: 1.08, duration: 14, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  g.from($$('.s1 .kick, .s1 .lead, .ptag', sec), { yPercent: 60, opacity: 0, duration: 1.1, ease: OUT, delay: 1.4, stagger: 0.12 });
  const LT = ['buiten', 'het opschrift', 'om de hoek']; let lastI = -1;
  const tl = g.timeline({ scrollTrigger: { trigger: sec, pin: true, start: 'top top', end: '+=200%', scrub: 0.7,
    onUpdate: st => { if (st.progress > 0.004) { if (idle) { idle = false; v.pause(); } sc(st.progress); } else if (!idle) { idle = true; v.currentTime = 0; tryPlay(); }
      const i = Math.min(2, Math.floor(st.progress * 3)); if (i !== lastI) { lastI = i; tp.textContent = `TAFEL 0${i} / 05`;
        g.to(lt, { duration: 0.6, overwrite: true, scrambleText: { text: LT[i], chars: 'aeilnoprst', speed: 0.7 } }); } } } });
  tl.to(s[0], { yPercent: -30, autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, 0.4)
    .fromTo(s[1], { autoAlpha: 0, rotateY: 180, transformPerspective: 1600 }, { autoAlpha: 1, rotateY: 0, duration: 0.8, ease: SOFT }, 1.05)
    .to(s[1], { yPercent: -30, autoAlpha: 0, duration: 0.6 }, 2.1)
    .fromTo(s[2], { autoAlpha: 0, rotateY: 180, transformPerspective: 1600 }, { autoAlpha: 1, rotateY: 0, duration: 0.8, ease: SOFT }, 2.75)
    .to('.scrollhint', { opacity: 0, duration: 0.3 }, 0).to({}, { duration: 0.6 });
})();

/* dag: pin + scrub dagfilm (K2..K6) met pauzes, zonnewijzer-schaduw draait mee */
(() => { const sec = $('#dag'); if (!sec) return;
  const lis = $$('.steps li', sec), pc = $('.pc', sec), v = $('video', sec), sc = scrubber(v), hand = $('.dial .hand', sec), arc = $('.dial .arc', sec);
  const A0 = -110, A1 = 110;
  const sector = a => { const r = 92, t0 = A0 * Math.PI / 180, t1 = a * Math.PI / 180;
    const p = t => `${(100 + r * Math.sin(t)).toFixed(1)} ${(100 - r * Math.cos(t)).toFixed(1)}`;
    return `M100 100 L${p(t0)} A${r} ${r} 0 ${a - A0 > 180 ? 1 : 0} 1 ${p(t1)} Z`; };
  const setA = f => { const a = A0 + (A1 - A0) * f; hand.style.transform = `rotate(${a}deg)`; arc.setAttribute('d', sector(Math.max(A0 + 0.5, a))); };
  lis[0].classList.add('on'); let cur = 0; setA(0);
  if (RM) { setA(1); return; }
  g.from($$('.dleft > :not(.goud)', sec), { x: -50, opacity: 0, stagger: 0.1, duration: 1, ease: OUT, scrollTrigger: { trigger: sec, start: 'top 70%' } });
  g.fromTo('#dag .arch', { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.6, ease: 'power3.inOut', scrollTrigger: { trigger: sec, start: 'top 75%' } });
  const H = 0.55, M = 1, TOT = 5 * H + 4 * M;
  const OX = [50, 46, 40, 56, 44];
  const ox = f => { const k = Math.min(3, Math.floor(f * 4)), r = f * 4 - k; return OX[k] + (OX[k + 1] - OX[k]) * g.parseEase('sine.inOut')(r); };
  const vf = p => { let u = p * TOT; for (let k = 0; k < 5; k++) { if (u <= H) return k / 4; u -= H; if (k < 4) { if (u <= M) return (k + g.parseEase('sine.inOut')(u / M)) / 4; u -= M; } } return 1; };
  ST.create({ trigger: sec, pin: true, start: 'top top', end: MOB ? '+=420%' : '+=520%', scrub: 0.8,
    onUpdate: st => { const f = vf(st.progress); sc(f); v.style.setProperty('--ox', ox(f).toFixed(1) + '%'); setA(st.progress);
      const i = Math.min(4, Math.round(f * 4));
      if (i !== cur) { const dir = i > cur ? 1 : -1; cur = i;
        lis.forEach((l, k) => l.classList.toggle('on', k === i));
        g.fromTo(lis[i], { y: 40 * dir, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: OUT, overwrite: true });
        g.to(pc, { duration: 0.5, overwrite: true, scrambleText: { text: `TAFEL 0${i + 1} / 05`, chars: '012345', speed: 0.8 } }); } } });
})();

/* raam: sticky pin, raam.js leest window.__raamP */
(() => { const sec = $('#raam'); if (!sec) return; const lis = $$('.rsides li', sec);
  window.__raamP = RM ? 0.8 : 0;
  const mark = p => { const n = p < 0.38 ? 0 : p < 0.55 ? 1 : 2; lis.forEach((l, k) => l.classList.toggle('on', k === n)); };
  if (RM) { mark(0.8); return; }
  ST.create({ trigger: sec, pin: true, start: 'top top', end: '+=300%', scrub: 1, onUpdate: st => { window.__raamP = st.progress; mark(st.progress); } });
  g.from('.rhud > *', { y: 50, opacity: 0, stagger: 0.12, duration: 1, ease: OUT, scrollTrigger: { trigger: sec, start: 'top 60%' } });
})();

/* spiegel: woord-voor-woord, gouden onderstreping */
(() => { const p = $('.words'); if (!p) return;
  const wrap = n => { [...n.childNodes].forEach(c => { if (c.nodeType === 3) { const f = document.createDocumentFragment();
    c.textContent.split(/(\s+)/).forEach(t => { if (!t) return; if (/^\s+$/.test(t)) f.append(t); else { const s = document.createElement('span'); s.className = 'w'; s.textContent = t; f.append(s); } }); c.replaceWith(f); }
    else if (c.nodeType === 1) wrap(c); }); };
  wrap(p); const ws = $$('.w', p), ks = $$('.k', p);
  if (RM) { ws.forEach(w => w.style.opacity = 1); ks.forEach(k => k.classList.add('lit')); return; }
  g.to(ws, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: p, start: 'top 80%', end: 'bottom 45%', scrub: 1,
    onUpdate: s => ks.forEach((k, i) => k.classList.toggle('lit', s.progress > 0.2 + i * 0.32)) } });
  g.fromTo('.sirap', { xPercent: 10 }, { xPercent: -30, ease: 'none', scrollTrigger: { trigger: '.spiegel', start: 'top bottom', end: 'bottom top', scrub: true } });
})();

/* wandeling: de route tekent zich, het kopje wandelt van de Paleisring naar Emmastraat 1b */
(() => { const sec = $('#wandeling'); if (!sec) return; const path = $('#walk'), svg = $('.route', sec), cup = $('.cupw', sec), st = $('.street', sec), mk = $$('.marks li', sec);
  const L = path.getTotalLength();
  const place = f => { const pt = path.getPointAtLength(L * f), m = svg.getScreenCTM(), r = st.getBoundingClientRect(); if (!m) return;
    const sp = svg.createSVGPoint(); sp.x = pt.x; sp.y = pt.y; const q = sp.matrixTransform(m); cup.style.transform = `translate(${q.x - r.left}px,${q.y - r.top}px)`; };
  if (RM) { place(1); mk.forEach(m => m.style.opacity = 1); return; }
  g.set(path, { drawSVG: '0%' }); place(0);
  const o = { f: 0 };
  g.timeline({ scrollTrigger: { trigger: st, start: 'top 80%', end: 'bottom 30%', scrub: 1 } })
    .to(o, { f: 1, ease: 'none', duration: 1, onUpdate: () => { g.set(path, { drawSVG: `0% ${o.f * 100}%` }); place(o.f); } }, 0)
    .from(mk[0], { y: 30, opacity: 0, duration: 0.15 }, 0)
    .from(mk[1], { y: 30, opacity: 0, duration: 0.15 }, 0.42)
    .from(mk[2], { y: 30, opacity: 0, duration: 0.15 }, 0.85);
  addEventListener('resize', () => place(o.f));
  g.to(cup, { rotate: 6, duration: 1.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
})();

/* belbord: het nummer wordt verguld (bladgoud-clip + glans) */
(() => { const sec = $('#belbord'); if (!sec) return; const gd = $('.bigtel .gold', sec);
  if (RM) return;
  g.timeline({ scrollTrigger: { trigger: '.bigtel', start: 'top 85%', end: 'top 30%', scrub: 1 } })
    .fromTo(gd, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', ease: 'none' })
    .fromTo(gd, { backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0', ease: 'none' }, 0);
  ST.create({ trigger: '.bigtel', start: 'top 80%', once: true, onEnter: () => g.to(gd, { duration: 1.4, scrambleText: { text: gd.textContent, chars: '0123456789', speed: 0.4 } }) });
})();

/* =============================== KAART =============================== */
(() => { const k = $('.kh'); if (!k || RM) return; g.from('.kh .lead, .kh .vlabel', { y: 40, opacity: 0, stagger: 0.12, duration: 1, ease: OUT, delay: 1.3 }); })();
(() => { const gl = $('.glass'); if (!gl) return;
  const set = (x, y) => { gl.style.setProperty('--mx', x + '%'); gl.style.setProperty('--my', y + '%'); };
  if (RM) { set(50, 50); return; }
  let user = false, vis = false, t = 0;
  new IntersectionObserver(([e]) => vis = e.isIntersecting).observe(gl);
  if (HOVER) gl.addEventListener('pointermove', e => { user = true; const r = gl.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100, (e.clientY - r.top) / r.height * 100); });
  gl.addEventListener('pointerleave', () => user = false);
  g.ticker.add((_, dt) => { if (!vis || user) return; t += dt / 1000; set(50 + Math.sin(t * 0.55) * 36, 50 + Math.sin(t * 1.1) * 26); });
})();

/* =============================== OVER =============================== */
(() => { const sec = $('#tweezijden'); if (!sec) return; const bq = $('.binnen .sq', sec), fr = $('.frame', sec);
  if (RM) return;
  g.set(bq, { rotateY: 180, opacity: 0.35 });
  g.timeline({ scrollTrigger: { trigger: sec, pin: true, start: 'top top', end: '+=150%', scrub: 1 } })
    .fromTo(fr, MOB ? { scaleX: 0 } : { scaleY: 0 }, MOB ? { scaleX: 1, duration: 0.3 } : { scaleY: 1, duration: 0.3, ease: 'none' }, 0)
    .from('.buiten .sq', { x: -60, opacity: 0, duration: 0.3 }, 0.05)
    .to(bq, { rotateY: 0, opacity: 1, duration: 0.5, ease: SOFT }, 0.35)
    .to('.frame i', { y: MOB ? 0 : 120, x: MOB ? 120 : 0, duration: 0.5 }, 0.35)
    .to({}, { duration: 0.15 });
})();
$$('.cell').forEach(c => c.addEventListener('pointerenter', e => { const r = c.getBoundingClientRect(); c.style.setProperty('--fx', (e.clientX - r.left) + 'px'); c.style.setProperty('--fy', (e.clientY - r.top) + 'px'); }));

/* =============================== RESERVEREN =============================== */
(() => { const f = $('#res'); if (!f) return;
  const tabs = $$('.tab'), panes = $$('.pane', f), prev = $('.prev', f), next = $('.next', f), send = $('.send', f), err = $('.err', f), ok = $('.ok', f);
  const rn = $('.rn'), rt = $('.rt'), rg = $('.rg'), rw = $('.rw'), tbs = $$('.plan .tb'); let cur = 0;
  const val = n => f.querySelector(`input[name=${n}]:checked`);
  const dayFmt = () => { const d = f.elements.dag.value, t = f.elements.tijd.value; if (!d && !t) return '—';
    let s = ''; if (d) { const dt = new Date(d + 'T12:00'); s = isNaN(dt) ? d : dt.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }); }
    return (s + (t ? ' · ' + t : '')).trim(); };
  const sc = (el, txt) => { if (el.textContent === txt) return; if (RM) el.textContent = txt; else g.to(el, { duration: 0.5, overwrite: true, scrambleText: { text: txt, chars: 'aeilnorst0123456789', speed: 0.9 } }); };
  const update = () => { const t = val('tafel'), gs = val('gasten'), nm = f.elements.naam.value.trim();
    tbs.forEach(b => b.classList.toggle('on', !!t && b.dataset.t === t.value));
    sc(rt, t ? t.dataset.t : '—'); sc(rg, gs ? gs.dataset.t : '—'); sc(rw, dayFmt());
    rn.textContent = nm || 'Uw naam';
    tabs[0].classList.toggle('done', !!t); tabs[1].classList.toggle('done', !!gs);
    tabs[2].classList.toggle('done', !!(f.elements.dag.value && f.elements.tijd.value)); tabs[3].classList.toggle('done', !!nm);
    dispatchEvent(new CustomEvent('raamnaam', { detail: { name: nm } })); };
  const show = i => { cur = i; tabs.forEach((t, k) => t.setAttribute('aria-selected', k === i)); panes.forEach((p, k) => p.hidden = k !== i);
    prev.hidden = i === 0; next.hidden = i === panes.length - 1; send.hidden = i !== panes.length - 1;
    if (!RM) g.from($$('.opt, label, .planwrap', panes[i]), { y: 30, opacity: 0, stagger: 0.04, duration: 0.6, ease: OUT }); };
  tbs.forEach(b => b.addEventListener('click', () => { const r = f.querySelector(`input[name=tafel][value=${b.dataset.t}]`); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true }));
    if (!RM) g.fromTo($('circle', b), { scale: 0.7, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.8, ease: 'elastic.out(1,0.4)' }); }));
  tabs.forEach((t, k) => t.addEventListener('click', () => show(k)));
  prev.addEventListener('click', () => show(Math.max(0, cur - 1))); next.addEventListener('click', () => show(Math.min(panes.length - 1, cur + 1)));
  f.addEventListener('change', e => { update(); if (e.target.type === 'radio' && cur < 2) setTimeout(() => show(cur + 1), 420); });
  f.addEventListener('input', update);
  const today = new Date(); f.elements.dag.min = today.toISOString().slice(0, 10);
  f.addEventListener('submit', e => { e.preventDefault(); const n = f.elements.naam, d = f.elements.dag, t = f.elements.tijd; let msg = '';
    [n, d, t].forEach(x => x.setAttribute('aria-invalid', 'false')); ok.hidden = true;
    if (!val('tafel')) { msg = 'Kies eerst een tafel.'; show(0); }
    else if (!val('gasten')) { msg = 'Kies het aantal gasten.'; show(1); }
    else if (!d.value) { msg = 'Kies een dag.'; d.setAttribute('aria-invalid', 'true'); show(2); d.focus(); }
    else if (!t.value) { msg = 'Kies een tijd.'; t.setAttribute('aria-invalid', 'true'); show(2); t.focus(); }
    else if (n.value.trim().length < 2) { msg = 'Vul je naam in.'; n.setAttribute('aria-invalid', 'true'); show(3); n.focus(); }
    if (msg) { err.textContent = msg; err.hidden = false; return; }
    err.hidden = true; ok.hidden = false;
    if (!RM) g.fromTo('.rkaart', { rotate: -2.5 }, { rotate: 0, duration: 1.2, ease: 'elastic.out(1,0.4)' }); });
  show(0); update();
  if (!RM) g.from('.rkaart', { y: -100, rotateY: 180, opacity: 0, transformPerspective: 1400, duration: 1.4, ease: 'power3.out', scrollTrigger: { trigger: '#config', start: 'top 70%' } });
})();
(() => { const a = $('.rh'); if (!a || RM) return; g.from('.rh .lead, .rh .begin', { y: 40, opacity: 0, stagger: 0.12, duration: 1, ease: OUT, delay: 1.3 }); })();

/* =============================== CONTACT =============================== */
(() => { const s = $('.signwrap'); if (!s || RM) return;
  g.from(s, { y: -200, rotate: MOB ? 5 : 16, opacity: 0, duration: 1.6, ease: 'elastic.out(1,0.5)', delay: 0.9 });
  g.to(s, { rotate: MOB ? 0.8 : 2, duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2.5 });
  g.to('#chero > video', { scale: 1.12, ease: 'none', scrollTrigger: { trigger: '#chero', start: 'top top', end: 'bottom top', scrub: true } });
})();
(() => { const m = $('.kmask'); if (!m) return; if (RM) { m.style.clipPath = 'none'; return; }
  g.fromTo(m, { clipPath: 'inset(40% 30% 0% 30%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: SOFT, scrollTrigger: { trigger: '.mapwrap', start: 'top 85%', end: 'center 50%', scrub: 1 } });
  g.fromTo('.mapring path', { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', scrollTrigger: { trigger: '.mapwrap', start: 'top 80%', end: 'bottom 60%', scrub: 1 } });
})();
(() => { const sp = $$('.fillt span'); if (!sp.length) return; if (RM) { sp.forEach(s => s.style.setProperty('--f', '100%')); return; }
  sp.forEach(s => g.fromTo(s, { '--f': '0%' }, { '--f': '100%', ease: 'none', scrollTrigger: { trigger: s, start: 'top 85%', end: 'top 40%', scrub: 1 } }));
  g.from('.asub', { y: 30, opacity: 0, duration: 1, ease: OUT, scrollTrigger: { trigger: '.asub', start: 'top 92%' } });
})();
(() => { const lv = $$('.doors .leaf'); if (!lv.length) return; if (RM) { lv.forEach(l => l.style.transform = 'rotateY(-100deg)'); return; }
  g.fromTo(lv, { rotateY: 0 }, { rotateY: -100, ease: SOFT, stagger: 0.15, scrollTrigger: { trigger: '.doors', start: 'top 80%', end: 'center 45%', scrub: 1 } });
})();

ST.sort(); ST.refresh();
addEventListener('load', () => { ST.sort(); ST.refresh(); });
