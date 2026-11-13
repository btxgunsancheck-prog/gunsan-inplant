/* 홈 화면용 3D 창고 장면(주하역장 배치도 기준). 실제 재고와 연결되지 않은 연출용이다. 단위는 미터. */
window.Warehouse3D = (() => {
  const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.min.js';
  const NAVY = 0x0b2282, ORANGE = 0xe0651e, FLOOR = 0xe9f1ff, WALL = 0xd2e2fc, WOOD = 0xc9a877, DARK = 0x2b2d33, STEEL = 0x8a8f99, YELLOW = 0xe3b23c;
  const BINS = [0x2f5bd0, 0xe0651e, 0x0f9d8a, 0xe3b23c, 0xc9a877, 0x9aa3b5];
  const W = 88, D = 54;
  const CART_GREEN = 0x4f9d5a;

  function supported() {
    try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; }
  }
  const isPhone = () => Math.min(screen.width, screen.height) < 600 || (navigator.deviceMemory && navigator.deviceMemory <= 4);

  async function mount(host, opts) {
    const started = performance.now();
    const THREE = await import(THREE_URL);
    const quality = (opts && opts.quality) || (isPhone() ? 'low' : 'high');
    const low = quality === 'low';
    const FRAME_MS = low ? 33 : 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const LOOK_Z = opts && opts.lookZ !== undefined ? opts.lookZ : 3;
    /* 영상 녹화용: hq는 그림자를 켜고, loop(초)를 주면 모든 움직임이 그 시간마다 정확히 처음으로 돌아온다 */
    const HQ = !!(opts && opts.hq);
    const LOOP = (opts && opts.loop) || 0; /* 값이 작을수록 장면이 화면 아래로 내려간다 */

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: low ? 'low-power' : 'high-performance', preserveDrawingBuffer: !!(opts && opts.keepFrame) });
    renderer.setPixelRatio((opts && opts.pixelRatio) || Math.min(window.devicePixelRatio || 1, low ? 2 : 1.5));
    host.append(renderer.domElement);
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xe8effc, 150, 260); /* 홈 배너 바탕색과 같게 */
    const camera = new THREE.PerspectiveCamera(28, 2, 1, 400);
    const hemi = new THREE.HemisphereLight(0xffffff, 0xc8ccd6, 1.5);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(30, 60, 40);
    scene.add(sun);
    if (HQ) {
      hemi.intensity = 1.15;
      sun.intensity = 2.1;
      sun.position.set(-38, 52, 30);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      sun.castShadow = true;
      sun.shadow.mapSize.set(4096, 4096);
      Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 60, bottom: -60, near: 1, far: 200 });
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = 0.03;
      sun.shadow.radius = 3;
    }

    /* 배치도 좌표(왼쪽 위 0,0)를 장면 좌표로 바꾼다 */
    const world = new THREE.Group();
    world.position.set(-W / 2, 0, -D / 2);
    scene.add(world);

    const box = new THREE.BoxGeometry(1, 1, 1);
    const cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, low ? 10 : 16);
    const flat = (color) => new THREE.MeshLambertMaterial({ color });
    const addBox = (parent, color, sx, sy, sz, x, y, z) => {
      const m = new THREE.Mesh(box, flat(color));
      m.scale.set(sx, sy, sz); m.position.set(x, y, z);
      parent.add(m);
      return m;
    };

    /* 같은 모양은 한 번에 그린다: [x, y, z, sx, sy, sz, color, rotY] */
    const groups = {};
    const item = (name, geo, color, it) => { (groups[name] = groups[name] || { geo, color, list: [] }).list.push(it); };
    let seed = 11;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const skip = () => low && rnd() < 0.45;

    /* 바닥, 구역 색, 벽 */
    const apron = addBox(world, 0xffffff, W + 30, 0.2, D + 30, W / 2 - 15, -0.12, D / 2 - 8);
    apron.visible = false; /* 바깥 바닥판은 그리지 않는다(배너 무늬 위에 창고만) */
    addBox(world, FLOOR, W, 0.2, D, W / 2, -0.1, D / 2);
    const zone = (x, z, w, d, color) => addBox(world, color, w, 0.02, d, x + w / 2, 0.01, z + d / 2);
    zone(0.3, 0.3, 26.7, 13.9, 0xf3ead9);
    zone(27.6, 0.3, 22.4, 13.9, 0xf8efd2);
    zone(50.5, 0.3, 37.2, 13.9, 0xefe6e2);
    zone(2.6, 18.2, 12.4, 9.4, 0xe5ede0); /* 위쪽 절반: 대물보관 */
    zone(2.6, 27.6, 12.4, 9.4, 0xe4e6eb); /* 아래쪽 절반: 하역장(부품 없음) */
    zone(18.7, 18.7, 36.3, 14.3, 0xe5ede0);
    zone(59.7, 14.6, 18.6, 39, 0xe2e7f2);
    zone(78.6, 14.6, 9.2, 39, 0xf3e5da);
    zone(20, 39, 14, 7, 0xe5ede0);
    zone(2.6, 41, 11.4, 7, 0xe5ede0);
    [[0, 16.2, W, 0.08], [0, 37.2, 59, 0.08]].forEach((l) => addBox(world, 0xf2c94c, l[2], 0.03, l[3], l[0] + l[2] / 2, 0.03, l[1]));
    addBox(world, WALL, W, 4, 0.3, W / 2, 2, -0.15);
    addBox(world, WALL, 0.3, 4, D, W + 0.15, 2, D / 2);
    [[0, 14.4], [18.4, 35.6], [40.6, 54]].forEach((s) => addBox(world, WALL, 0.3, 4, s[1] - s[0], -0.15, 2, (s[0] + s[1]) / 2));
    /* 사무실 */
    addBox(world, 0xf3d4d4, 14, 3, 6.5, 41, 1.5, 42.5);
    [35.6, 39.2, 42.8, 46.4].forEach((x) => [45.78, 39.22].forEach((z) => {
      addBox(world, DARK, 1.5, 1.1, 0.06, x, 1.7, z);
      addBox(world, 0xcfe0f3, 1.3, 0.9, 0.08, x, 1.7, z);
      addBox(world, DARK, 0.06, 0.9, 0.1, x, 1.7, z);
      addBox(world, DARK, 1.3, 0.06, 0.1, x, 1.7, z);
    }));
    /* 회사 로고(투명 배경 그림) */
    const logoTex = new THREE.TextureLoader().load(new URL('assets/logo-3d.png', location.href).href);
    logoTex.colorSpace = THREE.SRGBColorSpace;
    logoTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const logoMat = new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, depthWrite: false });
    const logoGeo = new THREE.PlaneGeometry(1, 90 / 483);
    const logo = (parent, w, x, y, z, rx, ry) => {
      const m = new THREE.Mesh(logoGeo, logoMat);
      m.scale.set(w, w, 1); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0);
      parent.add(m);
      return m;
    };
    logo(world, 10, 41, 3.03, 42.5, -Math.PI / 2, 0);
    addBox(world, 0xd8dbe3, 4, 2.4, 3, 50.3, 1.2, 44);

    /* 1단 선반: 호스·소물·벌크 작업장 */
    function shelf(x, z, len, dep, alongX) {
      if (skip()) return;
      const sx = alongX ? len : dep, sz = alongX ? dep : len;
      item('plate', box, NAVY, [x, 0.9, z, sx, 0.06, sz]);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((s) => item('leg', box, NAVY, [x + s[0] * (sx / 2 - 0.05), 0.45, z + s[1] * (sz / 2 - 0.05), 0.06, 0.9, 0.06]));
      item('plate', box, NAVY, [x, 0.25, z, sx, 0.04, sz]);
      const n = Math.max(1, Math.round(len / 0.55));
      for (let i = 0; i < n; i++) {
        if (rnd() < 0.2) continue;
        const t = (i + 0.5) / n - 0.5, h = 0.25 + rnd() * 0.3;
        const bx = alongX ? x + t * len : x, bz = alongX ? z : z + t * len;
        item('bin', box, pick(BINS), [bx, 0.93 + h / 2, bz, alongX ? len / n * 0.85 : dep * 0.8, h, alongX ? dep * 0.8 : len / n * 0.85]);
        if (rnd() < 0.6) item('bin', box, pick(BINS), [bx, 0.27 + h / 2, bz, alongX ? len / n * 0.85 : dep * 0.8, h * 0.8, alongX ? dep * 0.8 : len / n * 0.85]);
      }
    }
    /* 위치는 배치도에서 뽑은 값(warehouse-layout.js)을 쓴다 */
    const LAY = window.WAREHOUSE_LAYOUT || { hose: [], bulk: [], carts: [], wagons: [] };
    LAY.hose.forEach((s) => shelf(s[0], s[1], Math.max(s[2], s[3]), Math.min(s[2], s[3]), s[2] > s[3]));
    LAY.bulk.forEach((s) => shelf(s[0], s[1], Math.max(s[2], s[3]), Math.min(s[2], s[3]), s[2] > s[3]));
    [2.4, 5, 7.6, 10.2, 12.8].forEach((z) => { for (let x = 61; x < 87; x += 2.1) shelf(x, z, 1.9, 0.8, true); });

    /* 중물 작업장: 바퀴 달린 4단 망 카트(녹색)를 배치도 위치대로 줄지어 둔다 */
    function wireCart(x, z, w, d) {
      if (low && rnd() < 0.35) return;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach((s) => item('cpost', box, CART_GREEN, [x + s[0] * (w / 2 - 0.03), 0.85, z + s[1] * (d / 2 - 0.03), 0.04, 1.6, 0.04]));
      [0.2, 0.6, 1.0, 1.4].forEach((y) => {
        item('cshelf', box, CART_GREEN, [x, y, z, w, 0.03, d]);
        if (rnd() < 0.55) {
          const h = 0.12 + rnd() * 0.18;
          item('bin', box, pick([0xc9a877, 0xd6b98c, STEEL, 0x2f5bd0, 0xe0651e]), [x, y + 0.02 + h / 2, z, w * 0.8, h, d * 0.8]);
        }
      });
      item('cwheel', box, 0x1b1c20, [x, 0.04, z, w * 0.9, 0.08, d * 0.9]);
    }
    LAY.carts.forEach((c) => wireCart(c[0], c[1], c[2], c[3]));

    /* 대물 보관: 바닥에 두는 일반 부품 */
    function bulky(x0, z0, w, d, step) {
      for (let x = x0 + step / 2; x < x0 + w; x += step) {
        for (let z = z0 + step / 2; z < z0 + d; z += step) {
          if (rnd() < 0.18 || skip()) continue;
          const kind = rnd();
          const jx = x + (rnd() - 0.5) * 0.6, jz = z + (rnd() - 0.5) * 0.6;
          if (kind < 0.18) {
            [-0.35, 0.35].forEach((o) => item('pipe', cyl, STEEL, [jx + o, 0.38, jz, 0.7, step * 0.8, 0.7, 0, 0, Math.PI / 2]));
          } else if (kind < 0.3) {
            item('tire', cyl, 0x1b1c20, [jx, 0.45, jz, 1.6, 0.9, 1.6]);
          } else {
            const sw = step * (0.5 + rnd() * 0.3), sd = step * (0.4 + rnd() * 0.35), sh = 0.6 + rnd() * 1.2;
            item('pallet', box, WOOD, [jx, 0.07, jz, sw + 0.1, 0.14, sd + 0.1]);
            item('part', box, pick([STEEL, YELLOW, YELLOW, DARK, 0xa3a9b5]), [jx, 0.14 + sh / 2, jz, sw, sh, sd]);
          }
        }
      }
    }
    bulky(1, 1.5, 22, 11.5, 3.2);
    bulky(19.2, 19.2, 35.4, 13.4, 3);
    bulky(3, 18.8, 11.6, 8.2, 3);
    bulky(20.5, 39.5, 13, 6, 3);
    bulky(3, 41.6, 10.6, 6, 3);
    LAY.wagons.forEach((c) => wireCart(c[0], c[1], c[2], c[3]));

    const color = new THREE.Color();
    Object.values(groups).forEach((g) => {
      const mesh = new THREE.InstancedMesh(g.geo, flat(0xffffff), g.list.length);
      const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), e = new THREE.Euler();
      g.list.forEach((it, i) => {
        e.set(it[8] || 0, it[7] || 0, 0);
        mesh.setMatrixAt(i, m.compose(p.set(it[0], it[1], it[2]), q.setFromEuler(e), s.set(it[3], it[4], it[5])));
        mesh.setColorAt(i, color.setHex(it[6] !== undefined && typeof it[6] === 'number' && it[6] > 1 ? it[6] : g.color));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.frustumCulled = false;
      world.add(mesh);
    });

    /* 차량 */
    const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.26, low ? 8 : 14);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheel = (g, x, z, r) => { const w = new THREE.Mesh(wheelGeo, flat(0x1b1c20)); w.position.set(x, r || 0.3, z); if (r) w.scale.setScalar(r / 0.3); g.add(w); };
    function forklift(bodyColor) {
      const g = new THREE.Group();
      addBox(g, bodyColor, 1.1, 0.75, 1.9, 0, 0.62, -0.1);
      addBox(g, DARK, 1.0, 0.45, 0.5, 0, 0.72, -1.05);
      [[-0.48, -0.55], [0.48, -0.55], [-0.48, 0.45], [0.48, 0.45]].forEach((p) => addBox(g, DARK, 0.07, 1.25, 0.07, p[0], 1.55, p[1]));
      addBox(g, DARK, 1.08, 0.07, 1.1, 0, 2.2, -0.05);
      addBox(g, DARK, 0.1, 2.6, 0.1, -0.42, 1.3, 0.95);
      addBox(g, DARK, 0.1, 2.6, 0.1, 0.42, 1.3, 0.95);
      [[-0.58, -0.7], [0.58, -0.7], [-0.58, 0.55], [0.58, 0.55]].forEach((p) => wheel(g, p[0], p[1]));
      const lift = new THREE.Group();
      addBox(lift, DARK, 0.1, 0.06, 1.2, -0.3, 0, 1.55);
      addBox(lift, DARK, 0.1, 0.06, 1.2, 0.3, 0, 1.55);
      addBox(lift, WOOD, 1.1, 0.12, 1.1, 0, 0.1, 1.55);
      addBox(lift, YELLOW, 0.98, 0.8, 0.98, 0, 0.56, 1.55);
      g.add(lift);
      g.userData.lift = lift;
      world.add(g);
      return g;
    }
    function tractor() {
      const g = new THREE.Group();
      addBox(g, NAVY, 1.2, 0.6, 2.0, 0, 0.55, 0);
      addBox(g, DARK, 0.9, 0.5, 0.6, 0, 1.1, -0.4);
      [[-0.48, 0.55], [0.48, 0.55]].forEach((p) => addBox(g, DARK, 0.06, 1.2, 0.06, p[0], 1.45, p[1]));
      addBox(g, DARK, 1.15, 0.06, 1.3, 0, 2.05, -0.05);
      [[-0.62, -0.65], [0.62, -0.65], [-0.62, 0.65], [0.62, 0.65]].forEach((p) => wheel(g, p[0], p[1]));
      world.add(g);
      return g;
    }
    function cart(i) {
      const g = new THREE.Group();
      addBox(g, ORANGE, 1.3, 0.12, 2.1, 0, 0.42, 0);
      addBox(g, DARK, 0.08, 0.08, 0.7, 0, 0.42, -1.4);
      [[-0.55, -0.75], [0.55, -0.75], [-0.55, 0.75], [0.55, 0.75]].forEach((p) => wheel(g, p[0], p[1], 0.2));
      const h = 0.5 + (i % 3) * 0.25;
      addBox(g, [STEEL, YELLOW, 0xc9a877][i % 3], 1.1, h, 1.8, 0, 0.48 + h / 2, 0);
      world.add(g);
      return g;
    }
    /* 동선(2026-11 지정): 서쪽 벽 통로, 중물·벌크 사이 통로, 남쪽 끝 통로에는 차량이 다니지 않는다 */
    const track = (pts, closed) => new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], 0, p[1])), !!closed, 'centripetal');
    const FL = 0xf2c230;
    const routes = [
      { path: track([[4, 32.3], [10, 32.3], [16.6, 32.3]]), speed: LOOP ? 4 / LOOP : 0.06, at: 0, mesh: forklift(FL) },
      { path: track([[3.5, 14.9], [28, 14.9], [52, 14.9]]), speed: LOOP ? 2 / LOOP : 0.022, at: 0.3, mesh: forklift(FL) },
      { path: track([[56, 34.4], [36, 34.4], [17, 34.4]]), speed: LOOP ? 2 / LOOP : 0.026, at: 0.7, mesh: forklift(FL) }
    ];
    /* 견인차 2대: 남쪽 문으로 들어와 나타난다.
       1) 세로 통로로 올라와 가운데 통로 서쪽 끝에서 돌아 다시 남쪽으로 나간다.
       2) 세로 통로로 올라와 위쪽 통로를 지나 N5 문으로 나간다. */
    const towRoutes = [
      { path: track([[56.8, 60], [56.8, 38.2], [55, 36.3], [20, 36.3], [18.5, 36.95], [20, 37.6], [56.2, 37.6], [58.2, 39.4], [58.2, 60]]) },
      { path: track([[57.5, 60], [57.5, 18.6], [55.6, 16.6], [30, 16.6], [3, 16.6], [-14, 16.6]]) }
    ];
    /* 두 견인차가 같은 세로 통로를 동시에 쓰지 않도록 70초 주기 안에서 출발 시간을 나눈다 */
    const TOW_SPEED = 2.4, TOW_GAP = 2.8, TOW_CYCLE = LOOP || 70;
    towRoutes[0].start = 0;
    towRoutes[1].start = 13;
    towRoutes.forEach((r) => { r.len = r.path.getLength(); r.mesh = tractor(); r.carts = [0, 1, 2, 3].slice(0, low ? 3 : 4).map(cart); });
    const inside = (m) => m.position.z < 54.3 && m.position.x > -0.4;

    /* 셔틀 트럭 2대(N5는 차량 진입 불가)
       N4: 후진으로 공장 안까지 들어왔다가 앞으로 나간다.
       북쪽: 공장 밖을 동쪽에서 서쪽으로 지나가다 잠시 멈춘 뒤 다시 서쪽으로 가며 사라진다. */
    function makeTruck() {
      const truck = new THREE.Group();
      addBox(truck, 0xffffff, 9, 3.2, 3, -4.5, 2.2, 0);
      addBox(truck, NAVY, 9.02, 0.5, 3.02, -4.5, 1.3, 0);
      addBox(truck, ORANGE, 2.4, 2.5, 2.9, -10.6, 1.75, 0);
      [[-1.5, -1.45], [-1.5, 1.45], [-7, -1.45], [-7, 1.45], [-10.6, -1.45], [-10.6, 1.45]].forEach((p) => wheel(truck, p[0], p[1], 0.55));
      logo(truck, 6, -4.5, 2.55, 1.52, 0, 0);
      logo(truck, 6, -4.5, 2.55, -1.52, 0, Math.PI);
      world.add(truck);
      return truck;
    }
    const trucks = [
      { mesh: makeTruck(), z: 38.3, rot: 0, inside: 12, far: -40, cycle: 30, offset: 0 },
      { mesh: makeTruck(), pass: true }
    ];
    /* 북쪽 셔틀: 북쪽 바깥을 서쪽으로 지나 서쪽 바깥으로 돌아 내려오다 8초(N4 셔틀과 같은 시간) 멈춘 뒤 남쪽으로 사라진다.
       N4 셔틀이 안에 서 있는 동안 N4 앞을 지나가도록 같은 30초 주기에서 시간을 맞췄다. */
    const passPath = track([[74, -9], [30, -9], [-1, -9], [-7.5, -6], [-9.5, 0], [-9.5, 20], [-9.5, 45], [-9.5, 80]]);
    const PASS = { len: passPath.getLength(), speed: 9, stopAt: 0, pause: 8, start: 16, cycle: 30 };
    { const pt = new THREE.Vector3(); for (let k = 0; k <= 400; k++) { passPath.getPointAt(k / 400, pt); if (pt.z >= 18) { PASS.stopAt = k / 400 * PASS.len; break; } } }
    trucks.forEach((t) => { if (!t.pass) { t.mesh.rotation.y = t.rot; t.mesh.position.z = t.z; } });
    const ease = (t) => t * t * (3 - 2 * t);
    function truckAt(sec) {
      trucks.forEach((tr) => {
        const t = (sec + tr.offset) % tr.cycle;
        if (tr.pass) {
          const tp = (((sec - PASS.start) % PASS.cycle) + PASS.cycle) % PASS.cycle;
          const stopT = PASS.stopAt / PASS.speed;
          const d = tp < stopT ? tp * PASS.speed : tp < stopT + PASS.pause ? PASS.stopAt : (tp - PASS.pause) * PASS.speed;
          if (d > PASS.len) { tr.mesh.visible = false; return; }
          const u = d / PASS.len;
          passPath.getPointAt(u, vec);
          passPath.getTangentAt(u, tan);
          tr.mesh.position.copy(vec);
          tr.mesh.rotation.y = Math.atan2(tan.x, tan.z) + Math.PI / 2;
          tr.mesh.visible = vec.x < 66 && vec.z < 58;
          return;
        }
        tr.mesh.position.x = t < 7 ? tr.far + (tr.inside - tr.far) * ease(t / 7) : t < 15 ? tr.inside : t < 22 ? tr.inside + (tr.far - tr.inside) * ease((t - 15) / 7) : tr.far;
      });
    }

    function resize() {
      const w = host.clientWidth || 1, hgt = host.clientHeight || 1;
      renderer.setSize(w, hgt, false);
      camera.aspect = w / hgt;
      camera.updateProjectionMatrix();
    }
    const vec = new THREE.Vector3(), tan = new THREE.Vector3();
    const setOn = (mesh, path, p) => {
      path.getPointAt(p, vec);
      path.getTangentAt(p, tan);
      mesh.position.copy(vec);
      mesh.rotation.y = Math.atan2(tan.x, tan.z);
    };

    /* 피킹 작업자 4명(2026-11 요청 위치): 선반 사이 통로를 오가며 물건을 집어 들고 반대편에 내려놓는다.
       한 번 왕복은 15초로, 60초 반복 영상에서도 끊김 없이 이어진다. */
    const ball = new THREE.SphereGeometry(0.5, 12, 10);
    const SKIN = 0xe9c3a0, VEST = 0xff7a1a, PANTS = 0x2b3a55, HELMET = 0xffffff, CARTON = 0xc9a26b;
    function person() {
      const g = new THREE.Group();
      const S = 1.5; /* 멀리서도 보이도록 실제보다 조금 크게 */
      g.scale.set(S, S, S);
      const leg = (x) => { const p = new THREE.Group(); p.position.set(x, 0.85, 0); addBox(p, PANTS, 0.17, 0.85, 0.2, 0, -0.42, 0); g.add(p); return p; };
      const legs = [leg(-0.12), leg(0.12)];
      const upper = new THREE.Group();
      upper.position.y = 0.85;
      g.add(upper);
      addBox(upper, VEST, 0.5, 0.62, 0.3, 0, 0.31, 0);
      const head = new THREE.Mesh(ball, flat(SKIN)); head.scale.set(0.26, 0.28, 0.26); head.position.set(0, 0.78, 0); upper.add(head);
      addBox(upper, HELMET, 0.3, 0.1, 0.3, 0, 0.93, 0);
      const arm = (x) => { const p = new THREE.Group(); p.position.set(x, 0.58, 0); addBox(p, VEST, 0.13, 0.55, 0.15, 0, -0.27, 0); upper.add(p); return p; };
      const arms = [arm(-0.31), arm(0.31)];
      const carton = addBox(upper, CARTON, 0.5, 0.36, 0.4, 0, 0.28, 0.42);
      world.add(g);
      return { g, legs, arms, upper, carton };
    }
    const PICK_T = 15;
    const pickers = [
      { a: [39.3, 2.6], b: [39.3, 12.6], off: 0 },
      { a: [57.9, 2.2], b: [57.9, 11.8], off: 5 },
      { a: [77.6, 18.2], b: [77.6, 29.5], off: 9 },
      { a: [77.6, 38.4], b: [77.6, 49.6], off: 2.5 }
    ].map((p) => Object.assign(p, person()));
    function pickAt(sec) {
      const walk = (2 * Math.PI) * 2; /* 걸음: 초당 2번 */
      pickers.forEach((p) => {
        const t = (((sec + p.off) % PICK_T) + PICK_T) % PICK_T;
        let u, from, to, moving = false, carry = false, bend = 0;
        if (t < 5.5) { u = ease(t / 5.5); from = p.a; to = p.b; moving = true; }
        else if (t < 7.2) { u = 1; from = p.a; to = p.b; bend = Math.sin(Math.PI * (t - 5.5) / 1.7); carry = t > 6.4; }
        else if (t < 12.7) { u = ease((t - 7.2) / 5.5); from = p.b; to = p.a; moving = true; carry = true; }
        else if (t < 14.2) { u = 1; from = p.b; to = p.a; bend = Math.sin(Math.PI * (t - 12.7) / 1.5); carry = t < 13.5; }
        else { u = 1; from = p.b; to = p.a; }
        p.g.position.set(from[0] + (to[0] - from[0]) * u, 0, from[1] + (to[1] - from[1]) * u);
        p.g.rotation.y = Math.atan2(to[0] - from[0], to[1] - from[1]) + (moving || t >= 14.2 || t < 5.5 ? 0 : 0);
        const sw = moving ? Math.sin(sec * walk) * 0.55 : 0;
        p.legs[0].rotation.x = sw; p.legs[1].rotation.x = -sw;
        p.upper.rotation.x = bend * 0.6;
        p.carton.visible = carry;
        p.arms.forEach((arm, i) => { arm.rotation.x = carry ? -1.25 : (moving ? (i ? sw : -sw) : -bend * 0.9); });
      });
    }
    function place(sec) {
      routes.forEach((r) => {
        const k = (r.at * 2 + sec * r.speed) % 2;
        setOn(r.mesh, r.path, k < 1 ? k : 2 - k);
        if (k >= 1) r.mesh.rotation.y += Math.PI;
        r.mesh.userData.lift.position.y = 0.32 + 0.22 * (1 + Math.sin(sec * (LOOP ? Math.PI * 2 * 8 / LOOP : 0.8) + r.at * 6)) / 2;
      });
      towRoutes.forEach((r) => {
        const d = ((((sec - r.start) % TOW_CYCLE) + TOW_CYCLE) % TOW_CYCLE) * TOW_SPEED;
        [r.mesh].concat(r.carts).forEach((m, i) => {
          const at = d - i * TOW_GAP;
          if (at < 0 || at > r.len) { m.visible = false; return; }
          setOn(m, r.path, at / r.len);
          m.visible = inside(m);
        });
      });
      truckAt(sec);
      pickAt(sec);
      const fit = Math.max(0.82, 1.5 / camera.aspect);
      const a = 0.16; /* 화면 고정(회전 없음) */
      const dist = 108 * fit;
      camera.position.set(Math.sin(a) * dist, 44 * fit, Math.cos(a) * dist);
      camera.lookAt(0, 0, LOOK_Z);
      scene.fog.near = dist + 40;
      scene.fog.far = dist + 140;
    }

    if (HQ) {
      scene.traverse((o) => { if (o.isMesh || o.isInstancedMesh) { o.receiveShadow = true; o.castShadow = !(o.material && o.material.transparent); } });
    }
    let running = true, visible = true, raf = 0, last = 0, sec = 0, frames = 0, tick = performance.now(), fps = 0;
    const draw = () => { place(sec); renderer.render(scene, camera); };
    function loopFrame(now) {
      raf = requestAnimationFrame(loopFrame);
      if (!running || !visible || document.hidden) { last = now; return; }
      if (FRAME_MS && now - last < FRAME_MS) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      sec += dt;
      draw();
      frames++;
      if (now - tick >= 1000) { fps = Math.round(frames * 1000 / (now - tick)); frames = 0; tick = now; }
    }
    const ro = new ResizeObserver(() => { resize(); draw(); });
    ro.observe(host);
    const io = new IntersectionObserver((e) => { visible = e[0].isIntersecting; });
    io.observe(host);
    resize();
    draw();
    const loadMs = Math.round(performance.now() - started);
    if (!reduced) raf = requestAnimationFrame(loopFrame);
    const count = Object.values(groups).reduce((s, g) => s + g.list.length, 0);

    return {
      quality, loadMs,
      stats: () => ({ fps, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, cartons: count }),
      toggle() { running = !running; return running; },
      renderAt(s) { sec = s; draw(); },
      vehicles: () => ({ tows: towRoutes.map((r) => [r.mesh].concat(r.carts).map((m) => m.visible ? [m.position.x, m.position.z] : null)), trucks: trucks.map((t) => t.mesh.visible ? [t.mesh.position.x, t.mesh.position.z] : null) }),
      destroy() {
        cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
        scene.traverse((o) => { if (o.material) o.material.dispose(); });
        box.dispose(); cyl.dispose(); ball.dispose(); logoGeo.dispose(); logoTex.dispose(); wheelGeo.dispose(); renderer.dispose(); renderer.domElement.remove();
      }
    };
  }
  return { supported, mount };
})();
