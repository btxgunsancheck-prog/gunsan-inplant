/* 홈 화면용 3D 창고 장면. 실제 재고와 연결되지 않은 연출용이다. */
window.Warehouse3D = (() => {
  const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.min.js';
  const NAVY = 0x0b2282, ORANGE = 0xe0651e, FLOOR = 0xeceef2, WOOD = 0xc9a877, DARK = 0x2b2d33;
  const CARTON = [0xc9a877, 0xd6b98c, 0xb99766, 0xdcc8a4, 0xe6e6ea, 0x8ea0d8];

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
    scene.fog = new THREE.Fog(0xf5f5f7, 75, 135);
    const camera = new THREE.PerspectiveCamera(28, 2, 1, 240);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc8ccd6, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(20, 40, 25);
    scene.add(sun);

    const box = new THREE.BoxGeometry(1, 1, 1);
    const flat = (color) => new THREE.MeshLambertMaterial({ color });
    const addBox = (parent, color, sx, sy, sz, x, y, z) => {
      const m = new THREE.Mesh(box, flat(color));
      m.scale.set(sx, sy, sz); m.position.set(x, y, z);
      parent.add(m);
      return m;
    };

    /* 바닥과 통로 표시 */
    addBox(scene, FLOOR, 66, 0.2, 48, 0, -0.1, 1);
    [-10.75, -6.25, -1.75, 2.75].forEach((z) => addBox(scene, 0xf2c94c, 44, 0.02, 0.08, 0, 0.02, z));
    addBox(scene, 0xdfe2e8, 66, 5, 0.3, 0, 2.5, -22.9);
    addBox(scene, 0xdfe2e8, 0.3, 5, 48, -33, 2.5, 1);

    /* 랙: 같은 모양을 한 번에 그려 호출 수를 줄인다 */
    const rowsZ = low ? [-13, -4, 5] : [-13, -8.5, -4, 0.5, 5];
    const bays = low ? 10 : 16, levels = low ? 3 : 4, deep = low ? 1 : 2;
    const bayW = low ? 3.84 : 2.4, startX = -bays * bayW / 2, levelH = 1.7, depth = 1.5;
    const upCount = rowsZ.length * (bays + 1) * 2;
    const beamCount = rowsZ.length * bays * levels * 2;
    const slots = rowsZ.length * bays * levels * deep * 2;
    const postW = low ? 0.2 : 0.12, beamH = low ? 0.18 : 0.12;
    const uprights = new THREE.InstancedMesh(box, flat(NAVY), upCount);
    const beams = new THREE.InstancedMesh(box, flat(ORANGE), beamCount);
    const pallets = new THREE.InstancedMesh(box, flat(WOOD), slots);
    const cartons = new THREE.InstancedMesh(box, flat(0xffffff), slots);
    const mat = new THREE.Matrix4(), pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3();
    const put = (mesh, i, x, y, z, sx, sy, sz) => { mesh.setMatrixAt(i, mat.compose(pos.set(x, y, z), quat, scl.set(sx, sy, sz))); };
    let random = 7;
    const rnd = () => { random = (random * 16807) % 2147483647; return (random - 1) / 2147483646; };
    let u = 0, b = 0, c = 0;
    const color = new THREE.Color();
    rowsZ.forEach((z) => {
      for (let i = 0; i <= bays; i++) {
        [-depth / 2, depth / 2].forEach((dz) => put(uprights, u++, startX + i * bayW, levelH * levels / 2, z + dz, postW, levelH * levels, postW));
      }
      for (let i = 0; i < bays; i++) {
        const cx = startX + (i + 0.5) * bayW;
        for (let l = 0; l < levels; l++) {
          const y = l * levelH + 0.12;
          [-depth / 2, depth / 2].forEach((dz) => put(beams, b++, cx, y, z + dz, bayW - 0.1, beamH, 0.1));
          for (let a = -1; a <= 1; a += 2) {
            for (let d = 0; d < deep; d++) {
              if (rnd() < 0.24) continue;
              const px = cx + a * bayW / 4.1;
              const pz = z + (deep === 2 ? (d ? 0.36 : -0.36) : 0);
              const h = 0.55 + rnd() * 0.6;
              put(pallets, c, px, y + 0.13, pz, 1.0, 0.12, deep === 2 ? 0.66 : 1.2);
              put(cartons, c, px, y + 0.19 + h / 2, pz, 0.92, h, deep === 2 ? 0.6 : 1.1);
              cartons.setColorAt(c, color.setHex(CARTON[Math.floor(rnd() * CARTON.length)]));
              c++;
            }
          }
        }
      }
    });
    pallets.count = c; cartons.count = c;
    [uprights, beams, pallets, cartons].forEach((m) => { m.instanceMatrix.needsUpdate = true; m.frustumCulled = false; scene.add(m); });
    if (cartons.instanceColor) cartons.instanceColor.needsUpdate = true;

    /* 출하장에 쌓인 파렛트 */
    for (let i = 0; i < (low ? 6 : 12); i++) {
      const x = -19 + i * (low ? 7 : 3.4), z = 11 + (i % 3) * 1.6, h = 0.8 + (i % 4) * 0.3;
      addBox(scene, WOOD, 1.2, 0.14, 1.2, x, 0.07, z);
      addBox(scene, CARTON[i % CARTON.length], 1.05, h, 1.05, x, 0.14 + h / 2, z);
    }
    /* 도크 문 */
    const dockX = [-14, 0, 14];
    dockX.forEach((x) => addBox(scene, 0xcfd3dc, 4.6, 4.4, 0.2, x, 2.2, 24.6));

    /* 지게차 */
    function forklift(bodyColor) {
      const g = new THREE.Group();
      addBox(g, bodyColor, 1.1, 0.75, 1.9, 0, 0.62, -0.1);
      addBox(g, DARK, 1.0, 0.45, 0.5, 0, 0.72, -1.05);
      [[-0.48, 1.55, -0.55], [0.48, 1.55, -0.55], [-0.48, 1.55, 0.45], [0.48, 1.55, 0.45]].forEach((p) => addBox(g, DARK, 0.07, 1.25, 0.07, p[0], p[1], p[2]));
      addBox(g, DARK, 1.08, 0.07, 1.1, 0, 2.2, -0.05);
      addBox(g, DARK, 0.1, 2.6, 0.1, -0.42, 1.3, 0.95);
      addBox(g, DARK, 0.1, 2.6, 0.1, 0.42, 1.3, 0.95);
      const wheel = new THREE.CylinderGeometry(0.3, 0.3, 0.26, low ? 8 : 16);
      wheel.rotateZ(Math.PI / 2);
      [[-0.58, -0.7], [0.58, -0.7], [-0.58, 0.55], [0.58, 0.55]].forEach((p) => {
        const w = new THREE.Mesh(wheel, flat(0x1b1c20));
        w.position.set(p[0], 0.3, p[1]);
        g.add(w);
      });
      const lift = new THREE.Group();
      addBox(lift, DARK, 0.1, 0.06, 1.2, -0.3, 0, 1.55);
      addBox(lift, DARK, 0.1, 0.06, 1.2, 0.3, 0, 1.55);
      addBox(lift, WOOD, 1.1, 0.12, 1.1, 0, 0.1, 1.55);
      addBox(lift, CARTON[g.id % CARTON.length], 0.98, 0.8, 0.98, 0, 0.56, 1.55);
      g.add(lift);
      g.userData.lift = lift;
      scene.add(g);
      return g;
    }
    const loop = (x1, x2, z1, z2) => {
      const r = 1.6;
      const pts = [[x1 + r, z1], [x2 - r, z1], [x2, z1 + r], [x2, z2 - r], [x2 - r, z2], [x1 + r, z2], [x1, z2 - r], [x1, z1 + r]];
      return new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], 0, p[1])), true, 'catmullrom', 0.15);
    };
    const routes = low
      ? [{ path: loop(-22, 22, -8.5, 0.5), speed: 0.022, color: ORANGE, at: 0 }, { path: loop(-16, 16, 8, 15), speed: 0.03, color: NAVY, at: 0.5 }]
      : [{ path: loop(-22.5, 22.5, -10.75, -1.75), speed: 0.022, color: ORANGE, at: 0 }, { path: loop(-21.5, 21.5, -6.25, 2.75), speed: 0.02, color: 0xf2b134, at: 0.4 }, { path: loop(-18, 18, 8, 15.5), speed: 0.032, color: NAVY, at: 0.7 }, { path: loop(-18, 18, 8, 15.5), speed: 0.032, color: ORANGE, at: 0.2 }];
    routes.forEach((r) => { r.mesh = forklift(r.color); });

    /* 트럭: 후진으로 도크에 붙었다가 나간다 */
    const truck = new THREE.Group();
    addBox(truck, 0xffffff, 3, 3.2, 9, 0, 2.2, 4.5);
    addBox(truck, NAVY, 3.02, 0.5, 9.02, 0, 1.3, 4.5);
    addBox(truck, ORANGE, 2.9, 2.5, 2.4, 0, 1.75, 10.6);
    addBox(truck, 0x9fb7d9, 2.5, 0.9, 0.05, 0, 2.5, 11.81);
    const tyre = new THREE.CylinderGeometry(0.55, 0.55, 0.4, low ? 8 : 16);
    tyre.rotateZ(Math.PI / 2);
    [[-1.45, 1.5], [1.45, 1.5], [-1.45, 7], [1.45, 7], [-1.45, 10.6], [1.45, 10.6]].forEach((p) => {
      const w = new THREE.Mesh(tyre, flat(0x1b1c20));
      w.position.set(p[0], 0.55, p[1]);
      truck.add(w);
    });
    truck.position.set(0, 0, 50);
    scene.add(truck);
    const DOCK_Z = 25, FAR_Z = 62;
    const ease = (t) => t * t * (3 - 2 * t);
    function truckAt(sec) {
      const t = sec % 22;
      const lane = dockX[Math.floor(sec / 22) % dockX.length];
      truck.position.x = lane;
      if (t < 6) truck.position.z = FAR_Z + (DOCK_Z - FAR_Z) * ease(t / 6);
      else if (t < 13) truck.position.z = DOCK_Z;
      else if (t < 19) truck.position.z = DOCK_Z + (FAR_Z - DOCK_Z) * ease((t - 13) / 6);
      else truck.position.z = FAR_Z;
    }

    function resize() {
      const w = host.clientWidth || 1, hgt = host.clientHeight || 1;
      renderer.setSize(w, hgt, false);
      camera.aspect = w / hgt;
      camera.updateProjectionMatrix();
    }
    const vec = new THREE.Vector3(), tan = new THREE.Vector3();
    function place(sec) {
      routes.forEach((r) => {
        const p = (r.at + sec * r.speed) % 1;
        r.path.getPointAt(p, vec);
        r.path.getTangentAt(p, tan);
        r.mesh.position.copy(vec);
        r.mesh.rotation.y = Math.atan2(tan.x, tan.z);
        r.mesh.userData.lift.position.y = 0.32 + 0.22 * (1 + Math.sin(sec * 0.8 + r.at * 6)) / 2;
      });
      truckAt(sec);
      const fit = Math.max(1, 1.55 / camera.aspect);
      const a = 0.72 + Math.sin(sec * 0.08) * 0.14;
      const dist = 74 * fit;
      camera.position.set(Math.sin(a) * dist, 26 * fit, Math.cos(a) * dist);
      camera.lookAt(0, 1.5, 0);
      scene.fog.near = dist + 25;
      scene.fog.far = dist + 90;
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

    return {
      quality, loadMs,
      stats: () => ({ fps, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, cartons: c }),
      toggle() { running = !running; return running; },
      renderAt(s) { sec = s; draw(); },
      destroy() {
        cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
        scene.traverse((o) => { if (o.material) o.material.dispose(); });
        box.dispose(); renderer.dispose(); renderer.domElement.remove();
      }
    };
  }
  return { supported, mount };
})();
