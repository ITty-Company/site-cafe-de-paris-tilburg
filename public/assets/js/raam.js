/* Café de Paris — raam.js: Three.js «Het Raam». Een oude etalageruit (MeshPhysical transmission, licht golvend glas) met
   bladgoud-letters «Café de Paris» als echte geëxtrudeerde meshes (glyph-contouren Instrument Serif, bevel, metaal) in een groene houten pui met bovenlicht-roeden. Scroll = camera loopt
   van de straat DOOR het glas naar binnen en kijkt om: het opschrift wordt spiegelschrift; de zon schuift van ochtend naar avond.
   Drag ±0.6 rad. Op reserveren schrijft de naam van de gast zich in goud op het glas. Pauzeert buiten beeld; DPR ≤ 2. */
import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLYPHS } from './glyphs.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
const g = window.gsap, ST = window.ScrollTrigger;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOB = matchMedia('(max-width:760px)').matches;
const C = { creme: 0xF3ECDF, groen: 0x1E4A38, goud: 0xC29A45, avond: 0x121C17, inkt: 0x1B1F1C, kir: 0x7A2E3A };

// per pagina: bereik van de scroll-voortgang (camera) en het licht
const VIEW = { index: [0, 1], kaart: [0, 0.32], over: [0.8, 1], reserveren: [0, 0.24], contact: [0.02, 0.3] };

// glyph-contour (SVG-commando's in font-eenheden) → THREE.Shape[]
const geoCache = new Map();
function glyphGeo(ch, ital) {
  const key = (ital ? 'i' : 'r') + ch; if (geoCache.has(key)) return geoCache.get(key);
  const src = (ital ? GLYPHS.i : GLYPHS.r)[ch]; if (!src || !src[1]) { geoCache.set(key, null); return null; }
  const sp = new T.ShapePath(), tk = src[1].match(/[MLHVQCZ]|-?\d+(\.\d+)?/g); let i = 0, c = '', cx = 0, cy = 0;
  const n = () => +tk[i++];
  while (i < tk.length) { if (/[MLHVQCZ]/.test(tk[i])) c = tk[i++];
    if (c === 'M') { cx = n(); cy = n(); sp.moveTo(cx, cy); c = 'L'; }
    else if (c === 'L') { cx = n(); cy = n(); sp.lineTo(cx, cy); }
    else if (c === 'H') { cx = n(); sp.lineTo(cx, cy); }
    else if (c === 'V') { cy = n(); sp.lineTo(cx, cy); }
    else if (c === 'Q') { const a = n(), b = n(); cx = n(); cy = n(); sp.quadraticCurveTo(a, b, cx, cy); }
    else if (c === 'C') { const a = n(), b = n(), d = n(), e = n(); cx = n(); cy = n(); sp.bezierCurveTo(a, b, d, e, cx, cy); }
    else if (c === 'Z') { c = ''; } else i++; }
  // contouren zelf indelen: oriëntatie van de grootste contour = buitenkant, tegengestelde = gaten (in de kleinste omsluitende buitenkant)
  const cs = sp.subPaths.map(pp => { const pts = pp.getPoints(5); const a = T.ShapeUtils.area(pts); return { pts, a }; }).filter(c => c.pts.length > 2 && Math.abs(c.a) > 1);
  if (!cs.length) { geoCache.set(key, null); return null; }
  const big = cs.reduce((m, c) => Math.abs(c.a) > Math.abs(m.a) ? c : m), sgn = Math.sign(big.a);
  const inside = (pt, poly) => { let o = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < (b.x - a.x) * (pt.y - a.y) / (b.y - a.y) + a.x) o = !o; } return o; };
  const outs = cs.filter(c => Math.sign(c.a) === sgn).map(c => ({ c, sh: new T.Shape(c.pts) }));
  cs.filter(c => Math.sign(c.a) !== sgn).forEach(h => { const host = outs.filter(o => inside(h.pts[0], o.c.pts)).sort((x, y) => Math.abs(x.c.a) - Math.abs(y.c.a))[0]; if (host) host.sh.holes.push(new T.Path(h.pts)); });
  let g;
  try { g = new T.ExtrudeGeometry(outs.map(o => o.sh), { depth: 26, curveSegments: 5, bevelEnabled: true, bevelThickness: 7, bevelSize: 4, bevelSegments: 2 }); }
  catch (e) { geoCache.set(key, null); return null; }
  g.scale(1 / GLYPHS.upm, 1 / GLYPHS.upm, 1 / GLYPHS.upm); g.computeVertexNormals(); geoCache.set(key, g); return g;
}
// tekst op een boog (R = straal; Infinity = recht), gecentreerd; ital: set indices die cursief zijn
function arcText(str, size, R, mat, ital = new Set()) {
  const grp = new T.Group(), chars = [...str]; const adv = chars.map((ch, k) => ((ital.has(k) ? GLYPHS.i : GLYPHS.r)[ch] || GLYPHS.r[' '] || [300])[0] / GLYPHS.upm * size);
  const tot = adv.reduce((a, b) => a + b, 0); let x = -tot / 2;
  chars.forEach((ch, k) => { const geo = glyphGeo(ch, ital.has(k)); const mid = x + adv[k] / 2;
    if (geo) { const m = new T.Mesh(geo, mat); m.scale.set(size, size, size);
      if (isFinite(R)) { const th = mid / R; m.position.set(R * Math.sin(th) - Math.cos(th) * adv[k] / 2, R * Math.cos(th) - R + Math.sin(th) * adv[k] / 2, 0); m.rotation.z = -th; }
      else m.position.set(x, 0, 0);
      grp.add(m); }
    x += adv[k]; });
  return grp;
}

function tiles() { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d');
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? '#1B1F1C' : '#CFC5B2'; x.fillRect(i * 32, j * 32, 32, 32); }
  const t = new T.CanvasTexture(cv); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(6, 6); t.colorSpace = T.SRGBColorSpace; return t; }

function marble() { const cv = document.createElement('canvas'); cv.width = cv.height = 512; const x = cv.getContext('2d');
  x.fillStyle = '#F1ECE4'; x.fillRect(0, 0, 512, 512); x.strokeStyle = 'rgba(120,120,120,.25)';
  for (let k = 0; k < 14; k++) { x.lineWidth = Math.random() * 2 + 0.5; x.beginPath(); let px = Math.random() * 512, py = 0; x.moveTo(px, py);
    for (let s = 0; s < 20; s++) { px += (Math.random() - 0.5) * 60; py += 28; x.lineTo(px, py); } x.stroke(); }
  const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; return t; }

async function scene(box) {
  const cv = box.querySelector('canvas'), view = box.dataset.view || 'index';
  let R;
  try { R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: 'high-performance' }); }
  catch (e) { box.classList.add('nogl'); return; }
  R.setPixelRatio(Math.min(devicePixelRatio || 1, (MOB || matchMedia('(pointer:coarse)').matches) ? 1.5 : 2)); R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 0.92; R.outputColorSpace = T.SRGBColorSpace; R.localClippingEnabled = true;
  const S = new T.Scene(); const bgDay = new T.Color(0xCFDCE0), bgEve = new T.Color(0x0E1A2A); S.background = bgDay.clone(); S.fog = new T.Fog(S.background, 26, 60);
  S.environment = new T.PMREMGenerator(R).fromScene(new RoomEnvironment(), 0.04).texture; S.environmentIntensity = 0.9;
  const cam = new T.PerspectiveCamera(MOB ? 52 : 40, 1, 0.05, 80);

  // --- pui: groene houten lijst + plint
  const wood = new T.MeshStandardMaterial({ color: C.groen, roughness: 0.55, metalness: 0.05 });
  const W = 6.4, H = 3.8, b = 0.28;
  const bar = (w, h, d, x, y, z) => { const m = new T.Mesh(new RoundedBoxGeometry(w, h, d, 3, 0.05), wood); m.position.set(x, y, z); S.add(m); return m; };
  bar(W + 2 * b, b, 0.34, 0, H / 2 + b / 2, 0); bar(W + 2 * b, 1.1, 0.34, 0, -H / 2 - 0.55, 0); bar(b, H + 1.4, 0.34, -W / 2 - b / 2, -0.4, 0); bar(b, H + 1.4, 0.34, W / 2 + b / 2, -0.4, 0);
  // bovenlicht met roeden (переплёт) + kalf + glaslatten
  const TR = H / 2 - 0.78; bar(W, 0.14, 0.26, 0, TR, 0.02);
  for (let k = 1; k < 5; k++) bar(0.09, 0.78, 0.22, -W / 2 + k * W / 5, TR + 0.39, 0.02);
  const bead = new T.MeshStandardMaterial({ color: 0x163A2B, roughness: 0.5 });
  [[W, 0.06, 0, -H / 2 + 0.03], [W, 0.06, 0, TR - 0.1], [0.06, TR + H / 2 - 0.1, -W / 2 + 0.03, (TR - 0.1 - H / 2) / 2], [0.06, TR + H / 2 - 0.1, W / 2 - 0.03, (TR - 0.1 - H / 2) / 2]].forEach(([w, h, x, y]) => { const m = new T.Mesh(new RoundedBoxGeometry(w, h, 0.12, 2, 0.02), bead); m.position.set(x, y, 0.07); S.add(m); });
  // muur rond de pui (buiten)
  const wall = new T.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.9 });
  [[-(W / 2 + b) - 7.5, 0], [(W / 2 + b) + 7.5, 0]].forEach(([x]) => { const p = new T.Mesh(new T.BoxGeometry(15, 14, 0.3), wall); p.position.set(x, 0, -0.04); S.add(p); });
  const top = new T.Mesh(new T.BoxGeometry(W + 2 * b, 6, 0.3), wall); top.position.set(0, H / 2 + b + 3, -0.04); S.add(top);
  // luifel-strook boven de pui
  const awnC = document.createElement('canvas'); awnC.width = 512; awnC.height = 64; const ax = awnC.getContext('2d');
  for (let i = 0; i < 16; i++) { ax.fillStyle = i % 2 ? '#F3ECDF' : '#1E4A38'; ax.fillRect(i * 32, 0, 32, 64); }
  const awnT = new T.CanvasTexture(awnC); awnT.colorSpace = T.SRGBColorSpace;
  const awn = new T.Mesh(new T.PlaneGeometry(W + 1.2, 1.4, 1, 1), new T.MeshStandardMaterial({ map: awnT, roughness: 0.8, side: T.DoubleSide }));
  awn.position.set(0, H / 2 + b + 0.5, 0.75); awn.rotation.x = -0.9; S.add(awn);

  // --- het glas: licht golvend oud glas
  const gg = new T.PlaneGeometry(W, H, 48, 30); const pa = gg.attributes.position;
  for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i); pa.setZ(i, 0.012 * Math.sin(x * 3.1 + y * 0.7) + 0.008 * Math.sin(y * 5.3)); }
  gg.computeVertexNormals();
  const glassM = new T.MeshPhysicalMaterial({ color: 0xd6e8df, metalness: 0.1, roughness: 0.02, transparent: true, opacity: 0.1, side: T.DoubleSide, envMapIntensity: 2.4, clearcoat: 1, clearcoatRoughness: 0.02, reflectivity: 1, depthWrite: false });
  const glass = new T.Mesh(gg, glassM); S.add(glass);

  // --- bladgoud-letters: echte meshes (geëxtrudeerde glyphs met bevel), op een boog zoals op de etalage
  const goldM = new T.MeshStandardMaterial({ color: 0xE6C06A, metalness: 1, roughness: 0.16, envMapIntensity: 2.8, emissive: 0x5a3c0c, emissiveIntensity: 0.55 });
  const goldD = new T.MeshStandardMaterial({ color: 0xB48A3C, metalness: 1, roughness: 0.32, envMapIntensity: 1.6 });
  const word = arcText('Café de Paris', MOB ? 0.92 : 0.98, 7.2, goldM, new Set([5, 6])); word.position.set(0, 0.42, 0.06); S.add(word);
  const sub = arcText('EMMASTRAAT · TILBURG', 0.2, Infinity, goldD); sub.position.set(0, -0.55, 0.03); S.add(sub);
  const flo = new T.Mesh(new T.TorusGeometry(1.5, 0.014, 8, 80, Math.PI * 0.32), goldD); flo.rotation.z = Math.PI / 2 - Math.PI * 0.16; flo.position.set(0, -1.9, 0.04); S.add(flo);
  let nameG = null, nameT = 0;
  addEventListener('raamnaam', e => { if (view !== 'reserveren') return; clearTimeout(nameT); nameT = setTimeout(() => {
    if (nameG) { S.remove(nameG); nameG = null; } const nm = (e.detail.name || '').slice(0, 22); if (!nm) return;
    nameG = arcText(nm, 0.5, Infinity, goldM); nameG.position.set(0, -1.15, 0.03); S.add(nameG); }, 180); });
  // glans-reflectie op het glas: een schuine lichtstreep die meebeweegt met de camera
  const shC = document.createElement('canvas'); shC.width = 512; shC.height = 64; const shx = shC.getContext('2d'); const gr = shx.createLinearGradient(0, 0, 512, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.42, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,250,235,.9)'); gr.addColorStop(0.56, 'rgba(255,255,255,.15)'); gr.addColorStop(0.66, 'rgba(255,250,235,.5)'); gr.addColorStop(0.7, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  shx.fillStyle = gr; shx.fillRect(0, 0, 512, 64);
  const sheenM = new T.MeshBasicMaterial({ map: new T.CanvasTexture(shC), transparent: true, opacity: 0.32, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
  const sheen = new T.Mesh(new T.PlaneGeometry(W * 1.6, H * 1.6), sheenM); sheen.rotation.z = 0.5; sheen.position.z = 0.01;
  const sheenClip = new T.Group(); sheenClip.add(sheen); S.add(sheenClip);
  sheenM.clippingPlanes = [new T.Plane(new T.Vector3(-1, 0, 0), W / 2), new T.Plane(new T.Vector3(1, 0, 0), W / 2), new T.Plane(new T.Vector3(0, -1, 0), H / 2), new T.Plane(new T.Vector3(0, 1, 0), H / 2)];

  // --- binnen: tegelvloer, marmeren tafeltje met kopje, bank, lampen, achterwand
  const floor = new T.Mesh(new T.PlaneGeometry(16, 16), new T.MeshStandardMaterial({ map: tiles(), roughness: 0.4 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, -2.95, -7); S.add(floor);
  const street = new T.Mesh(new T.PlaneGeometry(30, 12), new T.MeshStandardMaterial({ color: 0x6b6156, roughness: 0.95 })); street.rotation.x = -Math.PI / 2; street.position.set(0, -2.95, 6); S.add(street);
  const back = new T.Mesh(new T.PlaneGeometry(16, 8), new T.MeshStandardMaterial({ color: 0x121C17, roughness: 0.8 })); back.position.set(0, 0.6, -12); S.add(back);
  // achterwand: messing planken met flessen en een gebogen spiegel
  const shelfM = new T.MeshStandardMaterial({ color: 0xC9A04E, metalness: 1, roughness: 0.3 });
  // lambrisering: groene panelen met messing lijst (rustig, edel — geen rekken vol flessen)
  const panM = new T.MeshStandardMaterial({ color: 0x173A2C, roughness: 0.55 });
  [-4.6, -2.8, 2.8, 4.6].forEach(x => { const pn = new T.Mesh(new RoundedBoxGeometry(1.5, 2.6, 0.12, 3, 0.04), panM); pn.position.set(x, -0.6, -11.85); S.add(pn); });
  const rule = new T.Mesh(new T.BoxGeometry(11, 0.05, 0.08), shelfM); rule.position.set(0, 0.82, -11.82); S.add(rule);
  [-3.7, 3.7].forEach(x => { const sc = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.35, 12), shelfM); sc.position.set(x, 1.6, -11.8); S.add(sc); });
  const mir = new T.Mesh(new T.PlaneGeometry(2.2, 3.4), new T.MeshStandardMaterial({ color: 0x8f8572, metalness: 1, roughness: 0.08 })); mir.position.set(0, 0.6, -11.9); S.add(mir);
  const mirTop = new T.Mesh(new T.CircleGeometry(1.1, 48, 0, Math.PI), mir.material); mirTop.position.set(0, 2.3, -11.9); S.add(mirTop);
  const arcF = new T.Mesh(new T.TorusGeometry(1.15, 0.05, 8, 48, Math.PI), shelfM); arcF.position.set(0, 2.3, -11.85); S.add(arcF);
  // straat aan de overkant (buiten): gevels met ramen die 's avonds aangaan
  const stC = document.createElement('canvas'); stC.width = 1024; stC.height = 256; const sx = stC.getContext('2d'), stE = document.createElement('canvas'); stE.width = 1024; stE.height = 256; const se = stE.getContext('2d');
  sx.fillStyle = '#5a3f31'; sx.fillRect(0, 0, 1024, 256); se.fillStyle = '#000'; se.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 26; i++) for (let j = 0; j < 3; j++) { const x = 12 + i * 39, y = 40 + j * 70; sx.fillStyle = '#2b2622'; sx.fillRect(x, y, 22, 40); if ((i * 7 + j * 3) % 5 < 3) { se.fillStyle = '#ffcf85'; se.fillRect(x + 2, y + 2, 18, 36); } }
  const stT = new T.CanvasTexture(stC), stET = new T.CanvasTexture(stE); stT.colorSpace = stET.colorSpace = T.SRGBColorSpace;
  const facM = new T.MeshStandardMaterial({ map: stT, emissiveMap: stET, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.9 });
  const fac = new T.Mesh(new T.PlaneGeometry(36, 9), facM); fac.position.set(0, 1.5, 16); fac.rotation.y = Math.PI; S.add(fac);
  const side1 = new T.Mesh(new T.PlaneGeometry(14, 8), new T.MeshStandardMaterial({ color: 0x16271F, roughness: 0.7 })); side1.position.set(-7.5, 0.6, -6); side1.rotation.y = Math.PI / 2; S.add(side1);
  const side2 = side1.clone(); side2.position.x = 7.5; side2.rotation.y = -Math.PI / 2; S.add(side2);
  const ceil = new T.Mesh(new T.PlaneGeometry(16, 14), new T.MeshStandardMaterial({ color: 0x0E1611, roughness: 0.9 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 4.4, -6); S.add(ceil);
  const brass = new T.MeshStandardMaterial({ color: C.goud, metalness: 1, roughness: 0.3 });
  const rail = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, W - 0.4, 16), brass); rail.rotation.z = Math.PI / 2; rail.position.set(0, -1.05, -0.35); S.add(rail);
  for (let k = 0; k < 6; k++) { const po = new T.Mesh(new T.CylinderGeometry(0.03, 0.04, 0.85, 12), brass); po.position.set(-W / 2 + 0.3 + k * (W - 0.6) / 5, -1.45, -0.35); S.add(po);
    const kn = new T.Mesh(new T.SphereGeometry(0.06, 16, 8), brass); kn.position.set(po.position.x, -1.02, -0.35); S.add(kn); }
  const table = new T.Group();
  const topM = new T.Mesh(new T.CylinderGeometry(0.85, 0.85, 0.06, 64), new T.MeshStandardMaterial({ map: marble(), roughness: 0.25 })); topM.position.y = 0.0; table.add(topM);
  const rim = new T.Mesh(new T.TorusGeometry(0.85, 0.02, 8, 64), brass); rim.rotation.x = Math.PI / 2; table.add(rim);
  const leg = new T.Mesh(new T.CylinderGeometry(0.05, 0.08, 1.9, 16), new T.MeshStandardMaterial({ color: 0x141414, metalness: 0.6, roughness: 0.4 })); leg.position.y = -0.97; table.add(leg);
  const foot = new T.Mesh(new T.CylinderGeometry(0.4, 0.45, 0.06, 32), leg.material); foot.position.y = -1.92; table.add(foot);
  const porc = new T.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, clearcoat: 1 });
  const saucer = new T.Mesh(new T.CylinderGeometry(0.2, 0.15, 0.025, 48), porc); saucer.position.set(0.15, 0.045, 0.1); table.add(saucer);
  const cup = new T.Mesh(new T.CylinderGeometry(0.1, 0.075, 0.13, 40, 1, true), porc); cup.position.set(0.15, 0.12, 0.1); table.add(cup);
  const coffee = new T.Mesh(new T.CircleGeometry(0.095, 32), new T.MeshStandardMaterial({ color: 0x3b2414, roughness: 0.3 })); coffee.rotation.x = -Math.PI / 2; coffee.position.set(0.15, 0.17, 0.1); table.add(coffee);
  const handle = new T.Mesh(new T.TorusGeometry(0.045, 0.012, 8, 20, Math.PI), porc); handle.position.set(0.26, 0.12, 0.1); handle.rotation.z = -Math.PI / 2; table.add(handle);
  table.position.set(0.9, -1.0, -2.2); S.add(table);
  const bank = new T.Mesh(new RoundedBoxGeometry(5, 1.1, 0.9, 4, 0.2), new T.MeshPhysicalMaterial({ color: 0x2a1619, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.35 })); bank.position.set(2.6, -2.35, -4.2); S.add(bank);
  const bankB = new T.Mesh(new RoundedBoxGeometry(5, 1.4, 0.4, 4, 0.18), bank.material); bankB.position.set(2.6, -1.5, -4.6); S.add(bankB);
  // bar met koperen rand
  const barM = new T.Mesh(new RoundedBoxGeometry(1.2, 2.2, 7, 3, 0.08), wood); barM.position.set(-5.2, -1.85, -6.5); S.add(barM);
  const barTop = new T.Mesh(new RoundedBoxGeometry(1.4, 0.1, 7.2, 3, 0.04), brass); barTop.position.set(-5.2, -0.72, -6.5); S.add(barTop);
  // lampen-bollen
  const lamps = []; const bulbM = new T.MeshStandardMaterial({ color: 0xfff0cc, emissive: 0xffd38a, emissiveIntensity: 0.2, roughness: 0.3 });
  [[-4.2, 1.9, -9.5], [-1, 2.2, -10.5], [2.4, 2.2, -10.5], [5.4, 1.9, -9.5], [-5.2, 0.2, -4.2], [-5.2, 0.2, -8.6]].forEach(([x, y, z]) => {
    const s = new T.Mesh(new T.SphereGeometry(0.26, 32, 16), bulbM); s.position.set(x, y, z); S.add(s);
    const l = new T.PointLight(0xffc46e, 0, 9, 1.6); l.position.set(x, y - 0.1, z + 0.3); S.add(l); lamps.push(l); });

  // --- licht: zon (spot) schuift van ochtend naar avond
  const hemi = new T.HemisphereLight(0xfff1dc, 0x241c14, 0.55); S.add(hemi);
  const sun = new T.SpotLight(0xffdca0, 70, 22, 0.5, 0.75, 1.2); sun.position.set(-7, 7, 9); sun.target.position.set(0, -1, -2); S.add(sun, sun.target);
  const rimL = new T.DirectionalLight(0xffffff, 0.6); rimL.position.set(4, 3, 6); S.add(rimL);

  // --- zachte bloom (desktop) op het goud en de lampen
  let comp = null, bloom = null;
  if (!MOB && !matchMedia('(pointer:coarse)').matches) { try { comp = new EffectComposer(R); comp.addPass(new RenderPass(S, cam)); bloom = new UnrealBloomPass(new T.Vector2(256, 256), 0.16, 0.35, 0.96); comp.addPass(bloom); comp.addPass(new OutputPass()); } catch (e) { comp = null; } }
  // --- maat & zichtbaarheid
  let zOff = 0;
  const size = () => { const w = box.clientWidth || 1, h = box.clientHeight || 1; R.setSize(w, h, false); comp && comp.setSize(w, h); cam.aspect = w / h;
    cam.fov = Math.min(78, Math.max(40, 2 * Math.atan(Math.tan(31 * Math.PI / 180) / cam.aspect) * 180 / Math.PI)); zOff = cam.aspect < 1 ? 2.5 : 0; cam.updateProjectionMatrix(); };
  size(); addEventListener('resize', size); if ('ResizeObserver' in window) new ResizeObserver(size).observe(box);
  let vis = true; new IntersectionObserver(([e]) => vis = e.isIntersecting, { rootMargin: '100px' }).observe(box);

  // --- scroll-voortgang
  const [p0, p1] = VIEW[view] || [0, 1]; const st = { p: RM ? (p0 + p1) / 2 : p0 };
  if (view !== 'index' && !RM) ST.create({ trigger: box.closest('section') || box, start: 'top bottom', end: 'bottom top', scrub: 1, onUpdate: s => { st.p = p0 + (p1 - p0) * s.progress; } });
  if (view === 'reserveren' && !RM) st.p = p0;

  // --- drag ±0.6
  const drag = { x: 0, y: 0, tx: 0, ty: 0, on: false, sx: 0, sy: 0 };
  cv.addEventListener('pointerdown', e => { drag.on = true; drag.sx = e.clientX - drag.tx * 400; drag.sy = e.clientY - drag.ty * 400; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; });
  cv.addEventListener('pointermove', e => { if (!drag.on) return; drag.tx = Math.max(-0.6, Math.min(0.6, (e.clientX - drag.sx) / 400)); drag.ty = Math.max(-0.25, Math.min(0.25, (e.clientY - drag.sy) / 400)); });
  const up = () => { drag.on = false; cv.style.cursor = 'grab'; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

  const tmp = new T.Vector3(), look = new T.Vector3(), ez = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  let t0 = performance.now();
  R.setAnimationLoop(() => { if (!vis) return; const now = performance.now(), t = (now - t0) / 1000;
    let p = view === 'index' ? (window.__raamP ?? 0) : st.p; if (RM) p = (p0 + p1) / 2;
    if (!drag.on) { drag.tx *= 0.94; drag.ty *= 0.94; } drag.x += (drag.tx - drag.x) * 0.12; drag.y += (drag.ty - drag.y) * 0.12;
    // camera: 0–0.55 dolly door het glas (z 8 → -3), 0.55–1 omdraaien naar het raam (spiegelschrift)
    const a = ez(clamp(p / 0.55)), b2 = ez(clamp((p - 0.55) / 0.45));
    const z = 8.5 + zOff - (14 + zOff * 0.6) * a, turn = Math.PI * b2;
    tmp.set(Math.sin(t * 0.25) * 0.08 + 1.6 * b2 * (1 - b2), 0.15 + Math.sin(t * 0.3) * 0.04 - 0.2 * b2, z);
    cam.position.copy(tmp);
    const yaw = turn + drag.x, pitch = drag.y * 0.5;
    look.set(tmp.x - Math.sin(yaw), tmp.y + pitch + 0.05, tmp.z - Math.cos(yaw));
    cam.lookAt(look);
    // licht: dag → avond
    const ev = view === 'contact' ? 0.7 + 0.3 * p : clamp((p - 0.35) / 0.6);
    S.background.copy(bgDay).lerp(bgEve, ev); S.fog.color.copy(S.background);
    sun.position.x = -7 + 14 * clamp(p * 1.1); sun.intensity = 70 * (1 - ev * 0.85); sun.color.setHSL(0.09, 0.9, 0.78 - ev * 0.12);
    hemi.intensity = 0.55 - ev * 0.35; lamps.forEach((l, i) => { l.intensity = 9 * ev * (0.92 + 0.08 * Math.sin(t * 3 + i)); }); bulbM.emissiveIntensity = 0.4 + 2.6 * ev; facM.emissiveIntensity = 0.8 * ev; facM.color.setScalar(1 - 0.8 * ev);
    sheen.position.x = -cam.position.x * 0.8 + Math.sin(t * 0.2) * 0.3 + (cam.position.z > 0 ? 1 : -1) * (p - 0.2) * 3; sheenM.opacity = 0.13 * (1 - ev * 0.5);
    if (comp) comp.render(); else R.render(S, cam); });
}

const boxes = [...document.querySelectorAll('.raam3d')];
boxes.forEach(b => scene(b).catch(e => { console.warn('raam', e); b.classList.add('nogl'); }));
