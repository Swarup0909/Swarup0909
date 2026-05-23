/* ════════════════════════════════════════════════════════════════════════════════
   MORYA LODGING — THREE.JS 3D ROOM WALKTHROUGH
   Interactive 3D room with OrbitControls, WASD navigation, ambient particles,
   dynamic lighting, and room-specific furniture for AC, Non-AC, and Dormitory.
   ════════════════════════════════════════════════════════════════════════════════ */

/* Three.js imports are loaded dynamically by the browser when the module script runs.
   This file is kept as a standalone module and is no longer loaded by main.js.
   To use the 3D experience, serve the site via a local HTTP server (e.g. `python -m http.server`)
   and uncomment the module script tag in index.html. */

// ── Room configuration by type ──
const ROOM_CFG = {
  ac: {
    wallColor: 0xf5f0e8,
    floorColor: 0x8B6914,
    baseboardColor: 0x6B4520,
    bedColor: 0x6B2737,
    sheetColor: 0xFFF8E7,
    accentColor: 0xD4AF37,
    rugColor: 0x8B2737,
    ambientIntensity: 0.5,
  },
  nonac: {
    wallColor: 0xf0ebe3,
    floorColor: 0x7A5C3A,
    baseboardColor: 0x5A3A1A,
    bedColor: 0x4A3520,
    sheetColor: 0xF5E8D8,
    accentColor: 0xC8860A,
    rugColor: 0x6B4520,
    ambientIntensity: 0.45,
  },
  dorm: {
    wallColor: 0xe8e3db,
    floorColor: 0x6B5230,
    baseboardColor: 0x4A3018,
    bedColor: 0x3A2510,
    sheetColor: 0xE8DCC8,
    accentColor: 0xA8760A,
    rugColor: 0x5A3A1A,
    ambientIntensity: 0.4,
  },
};

// ── Room dimensions ──
const RW = 5, RD = 4, RH = 2.8;
const HW = RW / 2, HD = RD / 2, HH = RH / 2;

// ── Module state ──
let scene, camera, renderer, controls, clock;
let container, roomTypeRef;
let rafId = null;
let meshes = [], particles = [], glowLights = [];
let resizeObs = null;
let keys = { w: false, a: false, s: false, d: false };
let diyaFlame, diyaGlow;
let fanGroup = null;
let alive = false;

// ── Touch device detection (exported for main.js to use for hint icons) ──
export const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// ═══════════════════════════════════════════════════════
//  PUBLIC API
// ═══════════════════════════════════════════════════════

export function initRoom3D(el, type) {
  if (alive) destroyRoom3D();
  if (!el) return;

  container = el;
  roomTypeRef = type || 'ac';
  const cfg = ROOM_CFG[roomTypeRef] || ROOM_CFG.ac;
  meshes = []; particles = []; glowLights = [];

  const rect = el.getBoundingClientRect();
  let w = rect.width || el.clientWidth || 800;
  let h = rect.height || el.clientHeight || 500;
  if (w < 10) w = 800;
  if (h < 10) h = 500;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(cfg.wallColor);
  scene.fog = new THREE.Fog(cfg.wallColor, 6, 12);

  // Camera
  camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 20);
  camera.position.set(0, 1.5, 3.2);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:block;';
  el.appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.5;
  controls.minDistance = 1.2;
  controls.maxDistance = 4.0;
  controls.target.set(0, 1.0, -0.5);
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.minPolarAngle = Math.PI / 6;
  controls.update();

  clock = new THREE.Clock();

  // Build scene content
  buildLights(cfg);
  buildShell(cfg);
  placeFurniture(cfg);
  placeDecor(cfg);
  spawnParticles(cfg);

  // Keyboard
  bindKeys();

  // Resize
  resizeObs = new ResizeObserver(() => resizeRoom3D());
  resizeObs.observe(el);

  // Add body class to suppress cursor trail during 3D interaction
  document.body.classList.add('room-3d-active');

  alive = true;
  animate();
}

export function destroyRoom3D() {
  alive = false;
  keys = { w: false, a: false, s: false, d: false };

  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  unbindKeys();

  // Dispose particle geometries and materials
  for (const p of particles) {
    if (p.geometry) p.geometry.dispose();
    if (p.material) p.material.dispose();
  }

  if (resizeObs && container) { resizeObs.unobserve(container); resizeObs = null; }

  // Remove body class
  document.body.classList.remove('room-3d-active');

  if (renderer && container) {
    renderer.dispose();
    if (renderer.domElement.parentNode) container.removeChild(renderer.domElement);
    renderer = null;
  }
  if (controls) { controls.dispose(); controls = null; }

  meshes.forEach(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
      else o.material.dispose();
    }
  });
  meshes = []; particles = []; glowLights = [];

  if (scene) {
    while (scene.children.length) {
      const c = scene.children[0];
      scene.remove(c);
    }
    scene = null;
  }

  fanGroup = null;
  diyaFlame = null; diyaGlow = null;
  clock = null; camera = null; container = null;
}

export function resizeRoom3D() {
  if (!container || !camera || !renderer) return;
  const rect = container.getBoundingClientRect();
  let w = rect.width || container.clientWidth || 800;
  let h = rect.height || container.clientHeight || 500;
  if (w < 10 || h < 10) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

// ═══════════════════════════════════════════════════════
//  LIGHTS
// ═══════════════════════════════════════════════════════

function buildLights(cfg) {
  scene.add(new THREE.AmbientLight(0xffeedd, cfg.ambientIntensity));

  const main = new THREE.DirectionalLight(0xfff5e8, 1.2);
  main.position.set(3, 5, 2);
  main.castShadow = true;
  main.shadow.mapSize.width = main.shadow.mapSize.height = 1024;
  const d = 6;
  main.shadow.camera.left = -d; main.shadow.camera.right = d;
  main.shadow.camera.top = d; main.shadow.camera.bottom = -d;
  main.shadow.camera.near = 1; main.shadow.camera.far = 10;
  scene.add(main);

  scene.add(new THREE.DirectionalLight(0xff8844, 0.25).position.set(-2, 1, 1));

  const ceilL = new THREE.PointLight(0xffcc88, 0.6, 5);
  ceilL.position.set(0, RH - 0.2, 0);
  scene.add(ceilL);

  const lampL = new THREE.PointLight(0xff8833, 0.4, 2.5);
  lampL.position.set(1.4, 0.8, -1.4);
  scene.add(lampL);
  glowLights.push(lampL);
}

// ═══════════════════════════════════════════════════════
//  ROOM SHELL
// ═══════════════════════════════════════════════════════

function buildShell(cfg) {
  const wMat = new THREE.MeshStandardMaterial({ color: cfg.wallColor, roughness: 0.6, metalness: 0, side: THREE.DoubleSide });
  const fMat = new THREE.MeshStandardMaterial({ color: cfg.floorColor, roughness: 0.7, metalness: 0.05 });
  const cMat = new THREE.MeshStandardMaterial({ color: 0xe8ddd0, roughness: 0.8, metalness: 0, side: THREE.DoubleSide });
  const bbMat = new THREE.MeshStandardMaterial({ color: cfg.baseboardColor, roughness: 0.5, metalness: 0 });

  // Back, left, right walls
  add(new THREE.BoxGeometry(RW, RH, 0.08), wMat, [0, HH, -HD]);
  add(new THREE.BoxGeometry(0.08, RH, RD), wMat, [-HW, HH, 0]);
  add(new THREE.BoxGeometry(0.08, RH, RD), wMat, [HW, HH, 0]);

  // Floor & ceiling
  const fl = add(new THREE.BoxGeometry(RW, 0.06, RD), fMat, [0, 0.03, 0]);
  fl.receiveShadow = true;
  add(new THREE.BoxGeometry(RW, 0.06, RD), cMat, [0, RH, 0]);

  // Baseboards
  add(new THREE.BoxGeometry(RW - 0.1, 0.08, 0.04), bbMat, [0, 0.04, -HD + 0.02]);
  add(new THREE.BoxGeometry(RW - 0.1, 0.08, 0.04), bbMat, [0, 0.04, HD - 0.02]);
  add(new THREE.BoxGeometry(0.04, 0.08, RD - 0.1), bbMat, [-HW + 0.02, 0.04, 0]);
  add(new THREE.BoxGeometry(0.04, 0.08, RD - 0.1), bbMat, [HW - 0.02, 0.04, 0]);

  // Rug
  const rug = add(new THREE.BoxGeometry(2.8, 0.02, 2.2), new THREE.MeshStandardMaterial({ color: cfg.rugColor, roughness: 0.9 }), [0, 0.05, 0.3]);
  rug.receiveShadow = true;
}

// ═══════════════════════════════════════════════════════
//  FURNITURE
// ═══════════════════════════════════════════════════════

function placeFurniture(cfg) {
  if (roomTypeRef === 'dorm') {
    placeBunks(cfg);
    placeLocker();
  } else {
    placeBed(cfg);
    placeNightstand(cfg);
    if (roomTypeRef === 'ac') placeAC();
    else placeFan();
  }
}

function placeBed(cfg) {
  const bz = -HD + 1.2;
  const hbMat = new THREE.MeshStandardMaterial({ color: cfg.bedColor, roughness: 0.6 });
  const mbMat = new THREE.MeshStandardMaterial({ color: 0xd4c8b8, roughness: 0.8 });
  const sheetMat = new THREE.MeshStandardMaterial({ color: cfg.sheetColor, roughness: 0.8 });
  const pillMat = new THREE.MeshStandardMaterial({ color: 0xf0f0ee, roughness: 0.85 });

  const hb = add(new THREE.BoxGeometry(1.8, 0.7, 0.08), hbMat, [0, 0.35, bz - 0.04]);
  hb.castShadow = true; hb.receiveShadow = true;
  add(new THREE.BoxGeometry(1.9, 0.06, 0.06), hbMat, [0, 0.72, bz - 0.03]);

  const mb = add(new THREE.BoxGeometry(1.6, 0.2, 2.0), mbMat, [0, 0.1, bz + 0.75]);
  mb.castShadow = true; mb.receiveShadow = true;
  const mt = add(new THREE.BoxGeometry(1.55, 0.08, 1.95), new THREE.MeshStandardMaterial({ color: 0xe8ddd0, roughness: 0.85 }), [0, 0.24, bz + 0.75]);
  mt.castShadow = true;

  add(new THREE.BoxGeometry(1.5, 0.04, 1.7), sheetMat, [0, 0.3, bz + 0.6]).castShadow = true;
  add(new THREE.BoxGeometry(0.5, 0.06, 0.08), new THREE.MeshStandardMaterial({ color: cfg.accentColor, roughness: 0.7 }), [0.3, 0.31, bz + 1.65]);

  add(new THREE.BoxGeometry(0.5, 0.12, 0.35), pillMat, [-0.35, 0.3, bz + 0.05]);
  add(new THREE.BoxGeometry(0.5, 0.12, 0.35), pillMat, [0.35, 0.3, bz + 0.05]);

  const frMat = new THREE.MeshStandardMaterial({ color: cfg.bedColor, roughness: 0.5 });
  add(new THREE.BoxGeometry(0.06, 0.15, 2.0), frMat, [-0.82, 0.075, bz + 0.75]);
  add(new THREE.BoxGeometry(0.06, 0.15, 2.0), frMat, [0.82, 0.075, bz + 0.75]);
}

function placeBunks(cfg) {
  const bz = -HD + 1.0;
  for (let b = 0; b < 2; b++) {
    const bx = b * 1.6 - 0.8;
    const fm = new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 0.6 });
    const mm = new THREE.MeshStandardMaterial({ color: 0xd0c8b8, roughness: 0.8 });
    const sm = new THREE.MeshStandardMaterial({ color: cfg.sheetColor, roughness: 0.8 });

    add(new THREE.BoxGeometry(1.3, 0.18, 1.9), mm, [bx, 0.19, bz + 0.75]);
    add(new THREE.BoxGeometry(1.25, 0.03, 1.8), sm, [bx, 0.3, bz + 0.75]);
    add(new THREE.BoxGeometry(1.3, 0.18, 1.9), mm, [bx, 1.3, bz + 0.75]);
    add(new THREE.BoxGeometry(1.25, 0.03, 1.8), sm, [bx, 1.4, bz + 0.75]);

    add(new THREE.BoxGeometry(0.06, 1.7, 0.06), fm, [bx - 0.68, 0.85, bz - 0.15]);
    add(new THREE.BoxGeometry(0.06, 1.7, 0.06), fm, [bx + 0.68, 0.85, bz - 0.15]);
    add(new THREE.BoxGeometry(0.06, 1.7, 0.06), fm, [bx - 0.68, 0.85, bz + 1.65]);
    add(new THREE.BoxGeometry(0.06, 1.7, 0.06), fm, [bx + 0.68, 0.85, bz + 1.65]);

    if (b === 0) {
      for (let r = 0; r < 4; r++)
        add(new THREE.BoxGeometry(0.03, 0.03, 0.35), fm, [bx + 0.82, 0.25 + r * 0.4, bz + 1.65]);
    }
  }
}

function placeLocker() {
  const lm = new THREE.MeshStandardMaterial({ color: 0x5a5040, roughness: 0.6, metalness: 0.1 });
  const dm = new THREE.MeshStandardMaterial({ color: 0x6a6050, roughness: 0.5 });
  const hm = new THREE.MeshStandardMaterial({ color: 0xD4AF37, roughness: 0.3, metalness: 0.6 });

  const l = add(new THREE.BoxGeometry(0.6, 1.4, 0.5), lm, [HW - 0.4, 0.7, HD - 0.3]);
  l.castShadow = true; l.receiveShadow = true;
  add(new THREE.BoxGeometry(0.55, 1.3, 0.03), dm, [HW - 0.4, 0.7, HD - 0.57]);
  add(new THREE.BoxGeometry(0.02, 0.06, 0.06), hm, [HW - 0.5, 0.7, HD - 0.57]);
}

function placeNightstand(cfg) {
  const nsMat = new THREE.MeshStandardMaterial({ color: 0x6a5040, roughness: 0.5 });
  const ns = add(new THREE.BoxGeometry(0.55, 0.6, 0.55), nsMat, [1.4, 0.3, -HD + 1.3]);
  ns.castShadow = true; ns.receiveShadow = true;

  add(new THREE.BoxGeometry(0.45, 0.15, 0.02), new THREE.MeshStandardMaterial({ color: 0x7a6050, roughness: 0.5 }), [1.4, 0.35, -HD + 1.02]);
  add(new THREE.BoxGeometry(0.04, 0.04, 0.03), new THREE.MeshStandardMaterial({ color: cfg.accentColor, roughness: 0.3, metalness: 0.5 }), [1.4, 0.35, -HD + 1.0]);

  add(new THREE.BoxGeometry(0.14, 0.02, 0.14), new THREE.MeshStandardMaterial({ color: cfg.accentColor, roughness: 0.3, metalness: 0.4 }), [1.4, 0.62, -HD + 1.3]);
  add(new THREE.BoxGeometry(0.08, 0.2, 0.08), new THREE.MeshStandardMaterial({ color: 0x8a7050, roughness: 0.5 }), [1.4, 0.73, -HD + 1.3]);

  const shadeMat = new THREE.MeshStandardMaterial({ color: 0xf5e8d0, roughness: 0.8, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
  add(new THREE.CylinderGeometry(0.18, 0.22, 0.15, 16), shadeMat, [1.4, 0.88, -HD + 1.3]);

  diyaGlow = add(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff8833, transparent: true, opacity: 0.15 }), [1.4, 0.78, -HD + 1.3]);
  diyaFlame = add(new THREE.SphereGeometry(0.04, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.8 }), [1.4, 0.86, -HD + 1.3]);
}

function placeAC() {
  const ac = add(new THREE.BoxGeometry(0.8, 0.25, 0.18), new THREE.MeshStandardMaterial({ color: 0xf0f0ee, roughness: 0.4, metalness: 0.1 }), [HW - 0.5, RH - 0.4, -HD + 0.1]);
  ac.castShadow = true;
  add(new THREE.BoxGeometry(0.6, 0.04, 0.02), new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 }), [HW - 0.5, RH - 0.42, -HD + 0.19]);
  const gl = new THREE.PointLight(0x4488ff, 0.1, 1);
  gl.position.set(HW - 0.5, RH - 0.4, -HD + 0.2);
  scene.add(gl);
}

function placeFan() {
  const fm = new THREE.MeshStandardMaterial({ color: 0xddd8d0, roughness: 0.4, metalness: 0.2 });
  const bm = new THREE.MeshStandardMaterial({ color: 0xccc8c0, roughness: 0.5 });
  // Static fan fixture (rod + pull chain)
  add(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12), fm, [0, RH - 0.1, -0.3]);
  add(new THREE.BoxGeometry(0.02, 0.1, 0.02), fm, [0, RH - 0.03, -0.3]);

  // Rotating blade group — positioned at ceiling centre, slightly offset in Z
  fanGroup = new THREE.Group();
  fanGroup.position.set(0, RH - 0.1, -0.3);
  scene.add(fanGroup);

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.005, 0.08), bm);
    bl.position.set(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3);
    bl.rotation.y = -a;
    bl.castShadow = true;
    fanGroup.add(bl);
  }
}

// ═══════════════════════════════════════════════════════
//  DECOR
// ═══════════════════════════════════════════════════════

function placeDecor(cfg) {
  placeWindow();

  const frameMat = new THREE.MeshStandardMaterial({ color: cfg.bedColor, roughness: 0.5 });
  const artMat = new THREE.MeshStandardMaterial({ color: cfg.accentColor, roughness: 0.4, metalness: 0.1 });
  add(new THREE.BoxGeometry(0.6, 0.5, 0.04), frameMat, [-1.1, 1.6, -HD + 0.04]);
  add(new THREE.BoxGeometry(0.5, 0.4, 0.05), artMat, [-1.1, 1.6, -HD + 0.06]);
  add(new THREE.CircleGeometry(0.05, 8), new THREE.MeshBasicMaterial({ color: 0xD4AF37 }), [-1.1, 1.6, -HD + 0.09]);

  if (roomTypeRef === 'ac') {
    add(new THREE.CylinderGeometry(0.12, 0.1, 0.15, 8), new THREE.MeshStandardMaterial({ color: 0x8a6a50, roughness: 0.6 }), [1.8, 0.075, 1.2]);
    for (let l = 0; l < 3; l++)
      add(new THREE.SphereGeometry(0.06, 4, 4), new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 0.8 }), [1.8 + Math.cos(l * 2.1) * 0.08, 0.12 + Math.sin(l * 1.3) * 0.04, 1.2 + Math.sin(l * 2.1) * 0.08]);
  }
}

function placeWindow() {
  const fm = new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.5 });
  const gm = new THREE.MeshStandardMaterial({ color: 0x88bbdd, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
  const vm = new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
  const wx = 0.6, wy = 1.6;

  add(new THREE.BoxGeometry(0.04, 0.6, 0.04), fm, [wx - 0.5, wy, -HD + 0.04]);
  add(new THREE.BoxGeometry(0.04, 0.6, 0.04), fm, [wx + 0.5, wy, -HD + 0.04]);
  add(new THREE.BoxGeometry(1.04, 0.04, 0.04), fm, [wx, wy + 0.3, -HD + 0.04]);
  add(new THREE.BoxGeometry(1.04, 0.04, 0.04), fm, [wx, wy - 0.3, -HD + 0.04]);
  add(new THREE.BoxGeometry(0.9, 0.5, 0.02), gm, [wx, wy, -HD + 0.05]);
  add(new THREE.BoxGeometry(0.9, 0.5, 0.01), vm, [wx, wy, -HD + 0.04]);
  add(new THREE.BoxGeometry(0.02, 0.5, 0.02), fm, [wx, wy, -HD + 0.05]);
  add(new THREE.BoxGeometry(0.9, 0.02, 0.02), fm, [wx, wy, -HD + 0.05]);
  add(new THREE.PlaneGeometry(1.5, 1.0), new THREE.MeshBasicMaterial({ color: 0xffffcc, transparent: true, opacity: 0.04, side: THREE.DoubleSide }), [wx + 0.5, 1.2, -HD + 0.3]);
}

// ═══════════════════════════════════════════════════════
//  PARTICLES
// ═══════════════════════════════════════════════════════

function spawnParticles(cfg) {
  const pm = new THREE.MeshBasicMaterial({ color: cfg.accentColor, transparent: true, opacity: 0.3 });
  for (let i = 0; i < 20; i++) {
    const size = 0.008 + Math.random() * 0.015;
    const p = new THREE.Mesh(new THREE.SphereGeometry(size, 4, 4), pm.clone());
    p.position.set(
      (Math.random() - 0.5) * (RW - 0.8),
      Math.random() * (RH - 0.5) + 0.3,
      (Math.random() - 0.5) * (RD - 0.8)
    );
    p.userData = {
      speed: 0.2 + Math.random() * 0.4,
      off: Math.random() * Math.PI * 2,
      baseY: p.position.y,
    };
    scene.add(p);
    particles.push(p);
  }
}

// ═══════════════════════════════════════════════════════
//  KEYBOARD
// ═══════════════════════════════════════════════════════

function bindKeys() {
  document.addEventListener('keydown', onKD);
  document.addEventListener('keyup', onKU);
}

function unbindKeys() {
  document.removeEventListener('keydown', onKD);
  document.removeEventListener('keyup', onKU);
}

function onKD(e) {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'a' || k === 's' || k === 'd') { keys[k] = true; e.preventDefault(); }
}

function onKU(e) {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'a' || k === 's' || k === 'd') keys[k] = false;
}

function moveWithKeys() {
  if (!keys.w && !keys.a && !keys.s && !keys.d) return;

  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  fwd.y = 0; fwd.normalize();
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  right.y = 0; right.normalize();

  const move = new THREE.Vector3();
  if (keys.w) move.add(fwd);
  if (keys.s) move.sub(fwd);
  if (keys.a) move.sub(right);
  if (keys.d) move.add(right);

  if (move.length() > 0) {
    move.normalize().multiplyScalar(0.02);
    controls.target.add(move);
    camera.position.add(move);
    const mx = HW - 0.3, mz = HD - 0.3, nx = -HW + 0.3, nz = -HD + 0.3;
    camera.position.x = Math.max(nx, Math.min(mx, camera.position.x));
    camera.position.z = Math.max(nz, Math.min(mz, camera.position.z));
    controls.target.x = Math.max(nx + 0.3, Math.min(mx - 0.3, controls.target.x));
    controls.target.z = Math.max(nz + 0.3, Math.min(mz - 0.3, controls.target.z));
  }
}

// ═══════════════════════════════════════════════════════
//  ANIMATION LOOP
// ═══════════════════════════════════════════════════════

function animate() {
  if (!alive) return;
  rafId = requestAnimationFrame(animate);

  const t = clock.getElapsedTime();

  for (const p of particles) {
    p.position.y = p.userData.baseY + Math.sin(t * p.userData.speed + p.userData.off) * 0.03;
    p.material.opacity = 0.2 + Math.sin(t * p.userData.speed + p.userData.off * 2) * 0.12;
  }

  // Fan blade rotation — smooth continuous spin
  if (fanGroup) {
    fanGroup.rotation.y += 0.035;
  }

  if (diyaFlame) {
    const s = 1 + Math.sin(t * 6) * 0.15 + Math.sin(t * 8.3) * 0.08;
    diyaFlame.scale.set(s, s * 1.3, s);
    diyaFlame.material.opacity = 0.6 + Math.sin(t * 5) * 0.2;
  }
  if (diyaGlow) {
    diyaGlow.material.opacity = 0.1 + Math.sin(t * 3) * 0.06;
    diyaGlow.scale.setScalar(1 + Math.sin(t * 2.5) * 0.1);
  }
  for (const gl of glowLights) gl.intensity = 0.35 + Math.sin(t * 2.5) * 0.1;

  moveWithKeys();
  controls.update();
  renderer.render(scene, camera);
}

// ═══════════════════════════════════════════════════════
//  PANORAMA VIEWER — Lightweight 360° Fallback for Touch Devices
//  Uses an inverted sphere with wrapped interior image texture
//  and simple pointer-based camera rotation (no OrbitControls).
// ═══════════════════════════════════════════════════════

let panoScene, panoCamera, panoRenderer, panoSphere;
let panoContainer, panoRafId, panoAlive = false;
let panoResizeObs = null;
let panoLon = 0, panoLat = 0;
let panoIsInteracting = false;
let panoTouchHandler = null;
let panoDownX = 0, panoDownY = 0;
let panoDownLon = 0, panoDownLat = 0;

/**
 * Initialize a lightweight 360° panorama viewer.
 * Uses the room's interior image wrapped inside a sphere.
 * Pointer/touch drag rotates the camera.
 */
export function initPanorama(el, roomType) {
  if (panoAlive) destroyPanorama();
  if (!el) return;

  panoContainer = el;
  panoLon = 0; panoLat = 0;
  panoIsInteracting = false;

  const rect = el.getBoundingClientRect();
  let w = rect.width || el.clientWidth || 800;
  let h = rect.height || el.clientHeight || 500;
  if (w < 10) w = 800;
  if (h < 10) h = 500;

  // Determine image source
  const roomDataMap = {
    ac: 'images/ac-room-interior.png',
    nonac: 'images/nonac-room-interior.png',
    dorm: 'images/dormitory-interior.png'
  };
  const imgSrc = roomDataMap[roomType] || roomDataMap.ac;

  // Scene
  panoScene = new THREE.Scene();

  // Camera
  panoCamera = new THREE.PerspectiveCamera(70, w / h, 0.1, 1000);
  panoCamera.position.set(0, 0, 0);

  // Renderer — no antialiasing for mobile perf
  panoRenderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  panoRenderer.setSize(w, h);
  panoRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  panoRenderer.domElement.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:block;';
  el.appendChild(panoRenderer.domElement);

  // Load texture and create sphere
  const loader = new THREE.TextureLoader();
  const tex = loader.load(imgSrc);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;

  // Inverted sphere (back-side material) for 360° interior view
  const geo = new THREE.SphereGeometry(500, 48, 32);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.BackSide,
  });
  panoSphere = new THREE.Mesh(geo, mat);
  panoScene.add(panoSphere);

  // Ambient glow overlay for atmosphere
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xff8844,
    transparent: true,
    opacity: 0.04,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const glowSphere = new THREE.Mesh(new THREE.SphereGeometry(498, 24, 16), glowMat);
  panoScene.add(glowSphere);

  // Bind pointer events for drag-to-look
  el.addEventListener('pointerdown', onPanoDown);
  document.addEventListener('pointermove', onPanoMove);
  document.addEventListener('pointerup', onPanoUp);
  // Touch-specific: prevent scroll while interacting
  panoTouchHandler = function(e) { if (e.target === panoRenderer.domElement) e.preventDefault(); };
  el.addEventListener('touchstart', panoTouchHandler, { passive: false });

  // Resize
  panoResizeObs = new ResizeObserver(() => resizePanorama());
  panoResizeObs.observe(el);

  // Hide cursor trail during panorama interaction
  document.body.classList.add('room-3d-active');

  panoAlive = true;
  animatePanorama();
}

export function destroyPanorama() {
  panoAlive = false;

  if (panoRafId) { cancelAnimationFrame(panoRafId); panoRafId = null; }

  // Remove event listeners
  if (panoContainer) {
    panoContainer.removeEventListener('pointerdown', onPanoDown);
    panoContainer.removeEventListener('touchstart', panoTouchHandler);
  }
  document.removeEventListener('pointermove', onPanoMove);
  document.removeEventListener('pointerup', onPanoUp);

  if (panoResizeObs && panoContainer) {
    panoResizeObs.unobserve(panoContainer);
    panoResizeObs = null;
  }

  document.body.classList.remove('room-3d-active');

  if (panoRenderer && panoContainer) {
    panoRenderer.dispose();
    if (panoRenderer.domElement.parentNode) panoContainer.removeChild(panoRenderer.domElement);
    panoRenderer = null;
  }

  if (panoScene) {
    while (panoScene.children.length) {
      const c = panoScene.children[0];
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
      panoScene.remove(c);
    }
    panoScene = null;
  }

  panoSphere = null;
  panoCamera = null;
  panoContainer = null;
}

function resizePanorama() {
  if (!panoContainer || !panoCamera || !panoRenderer) return;
  const rect = panoContainer.getBoundingClientRect();
  let w = rect.width || panoContainer.clientWidth || 800;
  let h = rect.height || panoContainer.clientHeight || 500;
  if (w < 10 || h < 10) return;
  panoCamera.aspect = w / h;
  panoCamera.updateProjectionMatrix();
  panoRenderer.setSize(w, h);
}

// ── Pointer handlers ──

function onPanoDown(e) {
  panoIsInteracting = true;
  panoDownX = e.clientX;
  panoDownY = e.clientY;
  panoDownLon = panoLon;
  panoDownLat = panoLat;
}

function onPanoMove(e) {
  if (!panoIsInteracting) return;
  const dx = e.clientX - panoDownX;
  const dy = e.clientY - panoDownY;
  panoLon = panoDownLon - dx * 0.3;
  panoLat = panoDownLat + dy * 0.3;
  panoLat = Math.max(-85, Math.min(85, panoLat));
}

function onPanoUp() {
  panoIsInteracting = false;
}

function animatePanorama() {
  if (!panoAlive) return;
  panoRafId = requestAnimationFrame(animatePanorama);

  // Apply rotation to camera with slight damping for smooth feel
  panoCamera.rotation.set(
    THREE.MathUtils.degToRad(panoLat),
    THREE.MathUtils.degToRad(panoLon),
    0,
    'YXZ'
  );

  panoRenderer.render(panoScene, panoCamera);
}

// ═══════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════

function add(geom, mat, pos) {
  const m = new THREE.Mesh(geom, mat);
  m.position.set(pos[0], pos[1], pos[2]);
  scene.add(m);
  meshes.push(m);
  return m;
}


