import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const MOODS = { idle: [0.65, 0.022], happy: [0.95, 0.032], busy: [1.25, 0.027] };
const clamp = THREE.MathUtils.clamp;
const damp = (a, b, rate, dt) => THREE.MathUtils.lerp(a, b, 1 - Math.exp(-rate * dt));

// Geometry is baked into a centred, unit-radius, Y-up object space first.
// This keeps both displacement and arm sectors independent of GLB node transforms.
function animateMaterial(material, uniforms) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `
      #include <common>
      uniform float uTime, uAmplitude, uMotion, uReach;
      varying vec3 vOctoLocal, vOctoWorld;
    `).replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vOctoLocal = position;
      float radius = length(position.xz) / uReach;
      float arms = smoothstep(0.18, 0.85, radius);
      float mantle = 1.0 - smoothstep(0.12, 0.48, radius);
      float breath = sin(uTime * 0.85) * 0.009 * uMotion * mantle;
      transformed.xz *= 1.0 + breath;
      transformed.y += position.y * breath * 0.65;
      float wave = sin(radius * 9.0 - uTime * 1.6 + position.x * 2.0);
      wave += 0.4 * sin(radius * 16.0 - uTime * 1.05 + position.z * 4.0);
      transformed.y += wave * uAmplitude * arms;
      transformed.xz += vec2(sin(uTime + position.z * 5.0),
        cos(uTime * 0.8 + position.x * 5.0)) * uAmplitude * arms * 0.24;
    `).replace('#include <project_vertex>', `
      #include <project_vertex>
      vOctoWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      uniform float uTime, uReveal, uPulse, uSector, uReach;
      uniform vec3 uCoral;
      varying vec3 vOctoLocal, vOctoWorld;
      float octoCaustic(vec2 p) {
        p += vec2(sin(p.y * 1.7 + uTime * 0.3),
                  cos(p.x * 1.4 - uTime * 0.26)) * 0.4;
        float a = sin(p.x * 3.4 + p.y * 2.1 + uTime * 0.32);
        float b = sin(p.y * 3.7 - p.x * 1.8 - uTime * 0.24);
        return pow(max(0.0, 1.0 - abs(a + b) * 0.75), 12.0);
      }
    `).replace('#include <color_fragment>', `
      #include <color_fragment>
      diffuseColor.a *= uReveal;
      float caustic = octoCaustic(vOctoWorld.xz * 3.0 + vOctoWorld.y * 0.7);
      diffuseColor.rgb *= 1.0 + caustic * 0.075;
    `).replace('#include <emissivemap_fragment>', `
      #include <emissivemap_fragment>
      totalEmissiveRadiance += vec3(0.38, 0.65, 0.7) * caustic * 0.012;
      float radius = length(vOctoLocal.xz) / uReach;
      float band = 1.0 - smoothstep(0.035, 0.14, abs(radius - uPulse * 1.25));
      float envelope = smoothstep(0.0, 0.12, uPulse)
        * (1.0 - smoothstep(0.78, 1.0, uPulse));
      float sector = 1.0;
      if (uSector >= 0.0) {
        float angle = atan(vOctoLocal.z, vOctoLocal.x) - uSector * 0.785398163;
        float distanceToSector = abs(atan(sin(angle), cos(angle)));
        sector = 1.0 - smoothstep(0.27, 0.392699082, distanceToSector);
      }
      totalEmissiveRadiance += uCoral * band * envelope * sector * 0.65;
    `);
  };
  material.customProgramCacheKey = () => 'octopus-natural-v1';
}

/** Mount a transparent, self-contained three.js r170 hero. The host owns sizing. */
export function mountOctopus(container, opts = {}) {
  const low = opts.quality === 'low';
  const interactive = opts.interactive !== false;
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  Object.assign(canvas.style, { width: '100%', height: '100%', display: 'block' });
  if (interactive) canvas.style.touchAction = 'none';
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 50);
  const body = new THREE.Group();
  scene.add(body);
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const ownGeometry = (g) => { geometries.add(g); return g; };
  const ownMaterial = (m) => { materials.add(m); return m; };
  function collect(root) {
    root.traverse((node) => {
      if (node.geometry) geometries.add(node.geometry);
      const list = Array.isArray(node.material) ? node.material : [node.material];
      for (const m of list) {
        if (!m) continue;
        materials.add(m);
        for (const value of Object.values(m)) if (value?.isTexture) textures.add(value);
      }
    });
  }
  function freeAssets() {
    const images = new Set();
    for (const t of textures) {
      if (t.source?.data) images.add(t.source.data);
      t.dispose();
    }
    for (const image of images) if (typeof image.close === 'function') image.close();
    for (const m of materials) m.dispose();
    for (const g of geometries) g.dispose();
    textures.clear(); materials.clear(); geometries.clear();
  }

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.06, 0.1, 30);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.32;
  room.dispose();
  pmrem.dispose();
  const key = new THREE.DirectionalLight(0xc1e0ed, 2.7);
  key.position.set(-2.5, 4, 2);
  const fill = new THREE.DirectionalLight(0x5b2ee5, 0.65);
  fill.position.set(3, 0.6, 1);
  const rim = new THREE.DirectionalLight(0xff6b5e, 1.8);
  rim.position.set(0.5, 1.3, -3);
  scene.add(key, fill, rim);

  const ring = new THREE.Mesh(
    ownGeometry(new THREE.RingGeometry(0.27, 0.276, 80)),
    ownMaterial(new THREE.MeshBasicMaterial({
      color: 0xc0abc9, transparent: true, opacity: 0.12,
      depthWrite: false, side: THREE.DoubleSide, toneMapped: false
    }))
  );
  scene.add(ring);

  const shadow = new THREE.Mesh(ownGeometry(new THREE.PlaneGeometry(2.5, 2.5)),
    ownMaterial(new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { opacity: { value: 0 } },
      vertexShader: `varying vec2 vUv;
        void main() { vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec2 vUv; uniform float opacity;
        void main() { float r = length((vUv - 0.5) * 2.0);
          float a = exp(-r * r * 5.0) * (1.0 - smoothstep(0.65, 1.0, r));
          gl_FragColor = vec4(0.015, 0.006, 0.027, a * opacity);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    })));
  shadow.rotation.x = -Math.PI / 2;
  shadow.visible = false;
  scene.add(shadow);

  const dustGeometry = ownGeometry(new THREE.BufferGeometry());
  const points = new Float32Array(120 * 3), seeds = new Float32Array(120);
  for (let i = 0; i < 120; i++) {
    points.set([(Math.random() - 0.5) * 5, (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4], i * 3);
    seeds[i] = Math.random();
  }
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
  dustGeometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
  const dustMaterial = ownMaterial(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { time: { value: 0 }, reveal: { value: 0 }, dpr: { value: 1 } },
    vertexShader: `attribute float seed; uniform float time, dpr;
      varying float vDepth, vSeed;
      void main() {
        vec3 p = position;
        p.y = mod(p.y + 2.0 + time * (0.025 + seed * 0.025), 4.0) - 2.0;
        p.x += sin(time * 0.15 + seed * 30.0) * 0.12;
        vec4 view = modelViewMatrix * vec4(p, 1.0);
        vDepth = -view.z; vSeed = seed;
        gl_Position = projectionMatrix * view;
        gl_PointSize = clamp((1.0 + seed * 1.5) * dpr * 3.0 / max(vDepth, 0.5),
          0.75, 3.0 * dpr);
      }`,
    fragmentShader: `uniform float reveal; varying float vDepth, vSeed;
      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float depthFade = smoothstep(0.8, 2.0, vDepth)
          * (1.0 - smoothstep(4.0, 9.0, vDepth));
        float a = (1.0 - smoothstep(0.1, 1.0, r)) * depthFade
          * (0.12 + vSeed * 0.18) * reveal;
        gl_FragColor = vec4(0.48, 0.58, 0.65, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  dust.frustumCulled = false;
  dust.visible = false;
  scene.add(dust);

  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = media.matches;
  const uniforms = {
    uTime: { value: 0 }, uAmplitude: { value: 0.022 }, uMotion: { value: 1 },
    uReveal: { value: 0 }, uReach: { value: 1 }, uPulse: { value: -1 },
    uSector: { value: -1 }, uCoral: { value: new THREE.Color('#FF6B5E') }
  };
  let disposed = false, loaded = false, faded = false, visible = false;
  let raf = 0, previous = 0, elapsed = 0, fade = 0, pulseAge = -1;
  let speed = MOODS.idle[0], amplitude = MOODS.idle[1], mood = MOODS.idle;
  let yaw = 0, pitch = 0, velocityX = 0, velocityY = 0, resumeAt = 0;
  let drag = null, width = 0, height = 0, distance = 4;
  const pointer = new THREE.Vector2(), parallax = new THREE.Vector2();
  const fadeMaterials = [];
  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; });

  function frame(now) {
    raf = 0;
    if (disposed || !visible || !width || !height) return;
    const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
    previous = now;
    elapsed += dt;
    const motion = reduced ? 0.5 : 1;
    speed = damp(speed, mood[0], 2.5, dt);
    amplitude = damp(amplitude, mood[1] * motion, 2.5, dt);
    uniforms.uTime.value += dt * speed;
    uniforms.uAmplitude.value = amplitude;
    uniforms.uMotion.value = motion;
    if (loaded) {
      fade = Math.min(1, fade + dt / 0.8);
      uniforms.uReveal.value = fade * fade * (3 - 2 * fade);
      if (fade === 1 && !faded) {
        faded = true;
        for (const [m, transparent] of fadeMaterials) {
          m.transparent = transparent;
          m.needsUpdate = true;
        }
      }
    }
    ring.visible = !loaded || fade < 1;
    ring.material.opacity = (0.085 + Math.sin(elapsed * 1.8) * 0.025 * motion)
      * (1 - uniforms.uReveal.value);
    ring.scale.setScalar(1 + Math.sin(elapsed * 1.8) * 0.035 * motion);
    ring.quaternion.copy(camera.quaternion);
    if (pulseAge >= 0 && loaded) {
      pulseAge += dt;
      if (pulseAge > 1.2) pulseAge = -1;
    }
    uniforms.uPulse.value = pulseAge < 0 ? -1 : pulseAge / 1.2;
    if (!drag) {
      yaw += velocityX * dt;
      pitch = clamp(pitch + velocityY * dt, -0.35, 0.35);
      velocityX *= Math.exp(-4.5 * dt);
      velocityY *= Math.exp(-4.5 * dt);
      if (!reduced && opts.autoRotate !== false && now >= resumeAt) yaw += dt * 0.065;
    }
    parallax.x = damp(parallax.x, pointer.x, 3, dt);
    parallax.y = damp(parallax.y, pointer.y, 3, dt);
    body.rotation.set(pitch + parallax.y * 0.025 * motion, yaw + parallax.x * 0.045 * motion, 0, 'YXZ');
    body.position.set(Math.sin(elapsed * 0.19) * 0.025 * motion,
      Math.sin(elapsed * 0.44) * 0.025 * motion, 0);
    shadow.material.uniforms.opacity.value = uniforms.uReveal.value * 0.3;
    shadow.scale.setScalar(1 - body.position.y * 0.5);
    dustMaterial.uniforms.time.value += dt * motion;
    dustMaterial.uniforms.reveal.value = uniforms.uReveal.value;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (!disposed && visible && width && height && !raf) {
      previous = 0;
      raf = requestAnimationFrame(frame);
    }
  }
  function resize() {
    if (disposed) return;
    width = container.clientWidth;
    height = container.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, low ? 1.25 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    dustMaterial.uniforms.dpr.value = dpr;
    camera.aspect = width / height;
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const limitingFov = Math.min(halfFov, Math.atan(Math.tan(halfFov) * camera.aspect));
    distance = 1.22 / Math.sin(limitingFov);
    camera.position.set(0, Math.sin(Math.PI / 9) * distance, Math.cos(Math.PI / 9) * distance);
    camera.far = distance + 15;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    wake();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
    else {
      cancelAnimationFrame(raf); raf = 0; previous = 0;
      velocityX = velocityY = 0;
    }
  });
  intersectionObserver.observe(container);
  const motionChange = () => { reduced = media.matches; };
  media.addEventListener('change', motionChange);
  window.addEventListener('resize', resize);
  resize();

  const listeners = [];
  function listen(type, fn) { canvas.addEventListener(type, fn); listeners.push([type, fn]); }
  function endDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    if (event.type !== 'pointerup' || performance.now() - drag.time > 100) {
      velocityX = velocityY = 0;
    }
    const id = drag.id;
    drag = null;
    resumeAt = performance.now() + 2000;
    pointer.set(0, 0);
    if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }
  if (interactive) {
    listen('pointerdown', (event) => {
      if (drag || !event.isPrimary || event.button !== 0) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now() };
      velocityX = velocityY = 0;
      canvas.setPointerCapture(event.pointerId);
    });
    listen('pointermove', (event) => {
      if (!event.isPrimary) return;
      const rect = canvas.getBoundingClientRect();
      pointer.set(clamp((event.clientX - rect.left) / Math.max(rect.width, 1) * 2 - 1, -1, 1),
        clamp((event.clientY - rect.top) / Math.max(rect.height, 1) * 2 - 1, -1, 1));
      if (!drag || event.pointerId !== drag.id) return;
      const now = performance.now(), dt = Math.max((now - drag.time) / 1000, 0.008);
      const dx = (event.clientX - drag.x) * 0.006, dy = (event.clientY - drag.y) * 0.004;
      yaw += dx;
      const nextPitch = clamp(pitch + dy, -0.35, 0.35);
      velocityX = clamp(dx / dt, -3, 3);
      velocityY = clamp((nextPitch - pitch) / dt, -1.5, 1.5);
      pitch = nextPitch;
      Object.assign(drag, { x: event.clientX, y: event.clientY, time: now });
    });
    listen('pointerup', endDrag);
    listen('pointercancel', endDrag);
    listen('lostpointercapture', endDrag);
    listen('pointerleave', () => { if (!drag) pointer.set(0, 0); });
  }

  // Late arrivals after dispose are collected and freed without touching WebGL.
  const url = opts.glbUrl ?? new URL('./assets/octopus-real.glb', import.meta.url).href;
  new GLTFLoader().loadAsync(url).then((gltf) => {
    for (const root of gltf.scenes) collect(root);
    if (disposed) { freeAssets(); return; }
    const root = gltf.scene;
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    if (!Number.isFinite(sphere.radius) || sphere.radius <= 0) throw new Error('Empty octopus bounds');
    const scale = 1 / sphere.radius;
    const normalize = new THREE.Matrix4().makeScale(scale, scale, scale);
    normalize.setPosition(sphere.center.clone().multiplyScalar(-scale));
    const size = bounds.getSize(new THREE.Vector3()).multiplyScalar(scale);
    uniforms.uReach.value = Math.max(Math.hypot(size.x, size.z) * 0.5, 0.001);
    const materialCopies = new Map();
    function copyMaterial(source) {
      if (materialCopies.has(source)) return materialCopies.get(source);
      if (!source.isMeshStandardMaterial) throw new Error('Expected a PBR material');
      const material = ownMaterial(source.clone());
      fadeMaterials.push([material, material.transparent]);
      material.transparent = true;
      animateMaterial(material, uniforms);
      materialCopies.set(source, material);
      return material;
    }
    root.traverse((node) => {
      if (!node.isMesh) return;
      const geometry = ownGeometry(node.geometry.clone());
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(normalize, node.matrixWorld));
      const material = Array.isArray(node.material)
        ? node.material.map(copyMaterial) : copyMaterial(node.material);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false; // Vertex shader motion exceeds the static bounds slightly.
      body.add(mesh);
    });
    if (!body.children.length) throw new Error('No octopus mesh');
    shadow.position.y = (bounds.min.y - sphere.center.y) * scale - 0.08;
    shadow.visible = dust.visible = true;
    loaded = true;
    wake();
  }).catch(() => {
    // The loading ring is also the deliberately quiet failure state.
    body.clear();
    loaded = false;
  }).finally(() => resolveReady());

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    resizeObserver.disconnect(); intersectionObserver.disconnect();
    media.removeEventListener('change', motionChange);
    window.removeEventListener('resize', resize);
    for (const [type, fn] of listeners) canvas.removeEventListener(type, fn);
    if (drag && canvas.hasPointerCapture(drag.id)) canvas.releasePointerCapture(drag.id);
    drag = null;
    scene.environment = null;
    scene.clear(); body.clear();
    freeAssets();
    environment.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    resolveReady();
  }
  return {
    ready, dispose,
    pulse(armIndex) {
      if (disposed) return;
      uniforms.uSector.value = Number.isInteger(armIndex) && armIndex >= 0 && armIndex < 8 ? armIndex : -1;
      pulseAge = 0;
    },
    setMood(name) {
      if (!disposed && Object.hasOwn(MOODS, name)) mood = MOODS[name];
    }
  };
}
