/* 홈 화면용 3D 창고 장면(주하역장 배치도 기준). 실제 재고와 연결되지 않은 연출용이다. 단위는 미터. */
window.Warehouse3D = (() => {
  const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.min.js';
  const NAVY = 0x0b2282, ORANGE = 0xe0651e, FLOOR = 0xeceef2, WOOD = 0xc9a877, DARK = 0x2b2d33, STEEL = 0x8a8f99, YELLOW = 0xe3b23c;
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

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: low ? 'low-power' : 'high-performance', preserveDrawingBuffer: !!(opts && opts.keepFrame) });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 2 : 1.5));
    host.append(renderer.domElement);
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xf5f5f7, 150, 260);
    const camera = new THREE.PerspectiveCamera(28, 2, 1, 400);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc8ccd6, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(30, 60, 40);
    scene.add(sun);

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
    addBox(world, 0xdfe2e8, W + 30, 0.2, D + 14, W / 2 - 15, -0.12, D / 2);
    addBox(world, FLOOR, W, 0.2, D, W / 2, -0.1, D / 2);
    const zone = (x, z, w, d, color) => addBox(world, color, w, 0.02, d, x + w / 2, 0.01, z + d / 2);
    zone(0.3, 0.3, 26.7, 13.9, 0xf3ead9);
    zone(27.6, 0.3, 22.4, 13.9, 0xf8efd2);
    zone(50.5, 0.3, 37.2, 13.9, 0xefe6e2);
    zone(2.6, 18.2, 12.4, 18.8, 0xe4e6eb); /* 하역장: 부품을 두지 않는다 */
    zone(18.7, 18.7, 36.3, 14.3, 0xe5ede0);
    zone(59.7, 14.6, 18.6, 39, 0xe2e7f2);
    zone(78.6, 14.6, 9.2, 39, 0xf3e5da);
    zone(20, 39, 14, 7, 0xe5ede0);
    zone(2.6, 41, 11.4, 7, 0xe5ede0);
    [[0, 16.2, W, 0.08], [0, 37.2, 59, 0.08]].forEach((l) => addBox(world, 0xf2c94c, l[2], 0.03, l[3], l[0] + l[2] / 2, 0.03, l[1]));
    addBox(world, 0xdfe2e8, W, 4, 0.3, W / 2, 2, -0.15);
    addBox(world, 0xdfe2e8, 0.3, 4, D, W + 0.15, 2, D / 2);
    [[0, 14.4], [18.4, 35.6], [40.6, 54]].forEach((s) => addBox(world, 0xdfe2e8, 0.3, 4, s[1] - s[0], -0.15, 2, (s[0] + s[1]) / 2));
    /* 사무실 */
    addBox(world, 0xf3d4d4, 14, 3, 6.5, 41, 1.5, 42.5);
    addBox(world, 0x9fb7d9, 13.8, 0.8, 0.05, 41, 2, 39.24);
    addBox(world, 0xd8dbe3, 4, 2.4, 3, 57.4, 1.2, 44);

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
    const routes = [
      { path: track([[4.5, 21], [12.5, 24], [5.5, 28.5], [12.5, 32.5], [6, 35.5]]), speed: 0.05, at: 0, mesh: forklift(0xf2b134) },
      { path: track([[3.5, 14.9], [28, 14.9], [52, 14.9]]), speed: 0.022, at: 0.3, mesh: forklift(ORANGE) },
      { path: track([[56, 36.2], [36, 36.2], [17, 36.2]]), speed: 0.026, at: 0.7, mesh: forklift(ORANGE) }
    ];
    /* 견인차: 중물작업장 남서쪽에서 출발해 세로 통로와 위쪽 통로로 대물 입고장 앞까지 갔다가 다른 차선으로 돌아온다 */
    const towPath = track([[56.8, 51.6], [56.8, 20], [54.8, 17.8], [36, 17.8], [18.5, 17.8], [17, 17.1], [18.5, 16.4], [36, 16.4], [56, 16.4], [58.2, 18.4], [58.2, 51.6], [57.5, 52.6]], true);
    const towLen = towPath.getLength();
    const tow = { mesh: tractor(), carts: [0, 1, 2, 3].slice(0, low ? 3 : 4).map(cart), speed: 2.2, gap: 2.8 };

    /* 트럭: 서쪽 N4 도크로만 후진한다(N5는 차량 진입 불가) */
    const truck = new THREE.Group();
    addBox(truck, 0xffffff, 9, 3.2, 3, -4.5, 2.2, 0);
    addBox(truck, NAVY, 9.02, 0.5, 3.02, -4.5, 1.3, 0);
    addBox(truck, ORANGE, 2.4, 2.5, 2.9, -10.6, 1.75, 0);
    [[-1.5, -1.45], [-1.5, 1.45], [-7, -1.45], [-7, 1.45], [-10.6, -1.45], [-10.6, 1.45]].forEach((p) => wheel(truck, p[0], p[1], 0.55));
    world.add(truck);
    /* 셔틀 트럭: N4로 공장 안까지 앞으로 들어왔다가 후진으로 나간다(N5는 차량 진입 불가) */
    truck.rotation.y = Math.PI;
    truck.position.z = 38.3;
    const INSIDE = 0.5, FAR = -52;
    const ease = (t) => t * t * (3 - 2 * t);
    function truckAt(sec) {
      const t = sec % 28;
      truck.position.x = t < 7 ? FAR + (INSIDE - FAR) * ease(t / 7) : t < 15 ? INSIDE : t < 22 ? INSIDE + (FAR - INSIDE) * ease((t - 15) / 7) : FAR;
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
    function place(sec) {
      routes.forEach((r) => {
        const k = (r.at * 2 + sec * r.speed) % 2;
        setOn(r.mesh, r.path, k < 1 ? k : 2 - k);
        if (k >= 1) r.mesh.rotation.y += Math.PI;
        r.mesh.userData.lift.position.y = 0.32 + 0.22 * (1 + Math.sin(sec * 0.8 + r.at * 6)) / 2;
      });
      const head = (sec * tow.speed / towLen) % 1;
      setOn(tow.mesh, towPath, head);
      tow.carts.forEach((c, i) => setOn(c, towPath, (head - (i + 1) * tow.gap / towLen + 2) % 1));
      truckAt(sec);
      const fit = Math.max(0.82, 1.5 / camera.aspect);
      const a = 0.16 + Math.sin(sec * 0.06) * 0.12;
      const dist = 108 * fit;
      camera.position.set(Math.sin(a) * dist, 44 * fit, Math.cos(a) * dist);
      camera.lookAt(0, 0, 3);
      scene.fog.near = dist + 40;
      scene.fog.far = dist + 140;
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
      destroy() {
        cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
        scene.traverse((o) => { if (o.material) o.material.dispose(); });
        box.dispose(); cyl.dispose(); wheelGeo.dispose(); renderer.dispose(); renderer.domElement.remove();
      }
    };
  }
  return { supported, mount };
})();
