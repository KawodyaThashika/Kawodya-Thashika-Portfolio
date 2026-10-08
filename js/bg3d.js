/* =========================================================
   BG 3D — scroll-driven particle morph used as the page
   background for every section after the hero.
   ring → hourglass → helix → wave → vortex → galaxy
   Scene follows the section that is in the middle of the screen.
   Pure Three.js (r128, already loaded by index.html).
   ========================================================= */
(function () {
  "use strict";

  var wrap = document.getElementById("cine");
  var canvas = document.getElementById("bg3d");
  if (!wrap || !canvas || typeof THREE === "undefined") return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isSmall = window.innerWidth < 720;
  var COUNT = isSmall ? 11000 : 24000;
  var SCENES = 6;

  /* sections that drive the scenes, in order (contact shares the galaxy) */
  var anchors = ["about", "experience", "skills", "projects", "education", "contact"]
    .map(function (id) { return document.getElementById(id); });
  if (anchors.some(function (a) { return !a; })) return;

  /* ---------- renderer ---------- */
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false, powerPreference: "high-performance" });
  } catch (e) {
    wrap.classList.add("cine--static");
    return;
  }
  var DPR = Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 8);

  /* ---------- seeded random so shapes are stable between loads ---------- */
  var seed = 1337;
  function rnd() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  /* ---------- target shapes (one Float32Array per scene) ---------- */
  var T = [];
  for (var s = 0; s < SCENES; s++) T.push(new Float32Array(COUNT * 3));
  var aRand = new Float32Array(COUNT);
  var aDir = new Float32Array(COUNT * 3);

  function set(arr, i, x, y, z) { arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z; }

  for (var i = 0; i < COUNT; i++) {
    var r1 = rnd(), r2 = rnd(), r3 = rnd(), r4 = rnd();
    aRand[i] = r1;

    // random unit vector used to scatter particles mid-transition
    var th = r2 * Math.PI * 2, ph = Math.acos(2 * r3 - 1);
    set(aDir, i, Math.sin(ph) * Math.cos(th), Math.sin(ph) * Math.sin(th), Math.cos(ph));

    /* 0 — ring: a rippling cylinder seen down its axis */
    var a0 = r1 * Math.PI * 2;
    var rad0 = 2.9 + Math.sin(a0 * 7 + r3 * 0.4) * 0.15 + Math.sin(a0 * 13) * 0.07 + (r4 - 0.5) * 0.1;
    var depth0 = (Math.floor(r2 * 46) / 46 - 0.5) * 2.8; // discrete rings → the "wire" look
    set(T[0], i, Math.cos(a0) * rad0, Math.sin(a0) * rad0, depth0 - 1.2);

    /* 1 — hourglass */
    var a1 = r1 * Math.PI * 2;
    var y1 = (r2 - 0.5) * 9;
    var r_1 = 0.22 + Math.pow(Math.abs(y1) / 4.5, 1.7) * 3.4;
    set(T[1], i, Math.cos(a1) * r_1, y1, Math.sin(a1) * r_1);

    /* 2 — DNA double helix with rungs */
    var y2 = (r2 - 0.5) * 10.5;
    var turn = y2 * 2.1;
    var which = i % 7; // 0-2 strand A, 3-5 strand B, 6 rung
    var hr = 0.85;
    var x2, z2;
    if (which < 3) {
      x2 = Math.cos(turn) * hr; z2 = Math.sin(turn) * hr;
    } else if (which < 6) {
      x2 = Math.cos(turn + Math.PI) * hr; z2 = Math.sin(turn + Math.PI) * hr;
    } else {
      var yy = Math.round(y2 * 4) / 4;
      var tt = yy * 2.1;
      var k = r4 * 2 - 1;
      y2 = yy;
      x2 = Math.cos(tt) * hr * k; z2 = Math.sin(tt) * hr * k;
    }
    var fuzz = which === 6 ? 0.03 : 0.16;
    set(T[2], i, x2 + (r1 - 0.5) * fuzz, y2, z2 + (r3 - 0.5) * fuzz);

    /* 3 — wave field along the bottom of the screen */
    var gx = (r1 - 0.5) * 22;
    var gz = -9 + r2 * 9.5;
    var wy = Math.sin(gx * 0.45 + gz * 0.3) * 0.35 + Math.sin(gx * 0.9 - gz * 0.5) * 0.14 + Math.cos(gz * 0.7) * 0.18;
    set(T[3], i, gx, wy - 3.6, gz);

    /* 4 — vortex funnelling into a black hole (flat; tilted in the shader) */
    var a4 = r1 * Math.PI * 2;
    var r4v = 0.95 + Math.pow(r2, 0.75) * 4.6;
    var funnel = -0.9 / Math.max(r4v - 0.55, 0.35);
    set(T[4], i, Math.cos(a4 + r4v * 0.35) * r4v, funnel + (r3 - 0.5) * 0.25, Math.sin(a4 + r4v * 0.35) * r4v);

    /* 5 — spiral galaxy + glowing orbits (flat; tilted in the shader) */
    var gx5, gz5, gy5;
    if (i % 5 === 0) {
      var ring = (i % 3) + 1;
      var oa = r1 * Math.PI * 2;
      var orad = 1.2 + ring * 0.5;
      gx5 = Math.cos(oa) * orad; gz5 = Math.sin(oa) * orad; gy5 = (r3 - 0.5) * 0.03;
    } else if (i % 9 === 1) {
      // dense glowing core
      var ca = r1 * Math.PI * 2, cr = Math.pow(r2, 2.2) * 0.45;
      gx5 = Math.cos(ca) * cr; gz5 = Math.sin(ca) * cr; gy5 = (r3 - 0.5) * 0.12;
    } else {
      var arm = i % 2;
      var rr = Math.pow(r2, 1.6) * 2.8 + 0.06;
      var ang = arm * Math.PI + rr * 1.25 + (r1 - 0.5) * 0.7 * (1.2 - rr * 0.2);
      gx5 = Math.cos(ang) * rr; gz5 = Math.sin(ang) * rr;
      gy5 = (r3 - 0.5) * 0.16 * (1.3 - rr * 0.25);
    }
    set(T[5], i, gx5 * 0.88, gy5, gz5 * 0.8);
  }

  /* ---------- geometry ---------- */
  var geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(T[0], 3)); // placeholder, real positions come from the shader
  for (var k2 = 0; k2 < SCENES; k2++) geo.setAttribute("t" + k2, new THREE.BufferAttribute(T[k2], 3));
  geo.setAttribute("aRand", new THREE.BufferAttribute(aRand, 1));
  geo.setAttribute("aDir", new THREE.BufferAttribute(aDir, 3));

  /* ---------- shaders ---------- */
  var vert = [
    "attribute vec3 t0; attribute vec3 t1; attribute vec3 t2;",
    "attribute vec3 t3; attribute vec3 t4; attribute vec3 t5;",
    "attribute float aRand; attribute vec3 aDir;",
    "uniform float uProgress; uniform float uTime; uniform float uSize; uniform vec2 uMouse;",
    "varying vec3 vPos; varying float vAlpha; varying float vHeat; varying float vRand;",

    "float tri(float k, float u) { return smoothstep(0.0, 1.0, max(0.0, 1.0 - abs(u - k))); }",

    "void main() {",
    // each particle drifts a little ahead/behind (only mid-transition) so the morph feels like a swarm
    "  float fr = fract(uProgress);",
    "  float k4 = 4.0 * fr * (1.0 - fr);",
    "  float u = clamp(uProgress + (aRand - 0.5) * 0.9 * k4, 0.0, 5.0);",
    "  float w0 = tri(0.0, u), w1 = tri(1.0, u), w2 = tri(2.0, u);",
    "  float w3 = tri(3.0, u), w4 = tri(4.0, u), w5 = tri(5.0, u);",
    "  vec3 p = t0 * w0 + t1 * w1 + t2 * w2 + t3 * w3 + t4 * w4 + t5 * w5;",

    // scatter mid-transition
    "  float wmax = max(max(max(w0, w1), max(w2, w3)), max(w4, w5));",
    "  float tr = clamp((1.0 - wmax) * 2.0, 0.0, 1.0);",
    "  p += aDir * tr * (1.2 + aRand * 2.4);",

    // gentle idle motion per scene
    "  float ripple = sin(uTime * 1.1 + p.x * 1.6 + p.y * 1.2) * 0.06;",
    "  p += vec3(ripple) * (w0 * 1.5 + w2 * 0.4 + w5 * 0.3);",
    "  p.y += (sin(p.x * 0.55 + uTime * 0.8) * 0.25 + sin(p.x * 1.1 - p.z * 0.6 + uTime * 1.3) * 0.12) * w3;",
    "  p.xy *= 1.0 + sin(uTime * 0.9 + atan(p.y, p.x) * 5.0) * 0.012 * w0;",

    // rotation around the vertical axis
    "  float ang = uTime * (0.22 * w1 + 0.45 * w2 + 0.22 * w4 + 0.12 * w5);",
    "  float cs = cos(ang), sn = sin(ang);",
    "  p.xz = vec2(cs * p.x - sn * p.z, sn * p.x + cs * p.z);",

    // tilt the flat vortex / galaxy discs toward the viewer, then place them
    "  float tl = 0.75 * w4 + 0.36 * w5;",
    "  float ct = cos(tl), st = sin(tl);",
    "  p.yz = vec2(ct * p.y - st * p.z, st * p.y + ct * p.z);",
    "  p.y += 1.6 * w4 - 0.25 * w5;",

    // mouse parallax: swarm leans toward the pointer
    "  p.xy += uMouse * 0.35 * (0.4 + aRand * 0.6);",

    "  vPos = p;",
    "  vRand = aRand;",
    "  vHeat = w5 * (1.0 - smoothstep(0.0, 1.4, length(vec2(p.x, (p.y + 0.25) * 3.0))));",
    "  vAlpha = 0.45 + aRand * 0.55;",

    "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
    "  gl_Position = projectionMatrix * mv;",
    "  float sz = uSize * (0.55 + aRand * 0.9) * (1.0 + w4 * 0.15 + w3 * 0.3);",
    "  gl_PointSize = sz * (7.0 / -mv.z);",
    "}"
  ].join("\n");

  var frag = [
    "precision highp float;",
    "varying vec3 vPos; varying float vAlpha; varying float vHeat; varying float vRand;",
    "uniform vec3 uBlue; uniform vec3 uOrange; uniform vec3 uViolet; uniform float uOpacity;",
    "void main() {",
    "  vec2 c = gl_PointCoord - 0.5;",
    "  float d = length(c);",
    "  if (d > 0.5) discard;",
    "  float soft = smoothstep(0.5, 0.0, d);",
    // blue (lower-left) → violet → orange (upper-right)
    "  float g = clamp(vPos.x * 0.12 + vPos.y * 0.17 + 0.5, 0.0, 1.0);",
    "  vec3 col = g < 0.5 ? mix(uBlue, uViolet, g * 2.0) : mix(uViolet, uOrange, (g - 0.5) * 2.0);",
    "  col = mix(col, vec3(1.0, 0.82, 0.62), vHeat);",
    "  col += vec3(0.25) * step(0.93, vRand);", // a few white stars
    "  gl_FragColor = vec4(col, soft * vAlpha * uOpacity);",
    "}"
  ].join("\n");

  var uniforms = {
    uProgress: { value: 0 },
    uTime: { value: 0 },
    uSize: { value: 2.6 * DPR },
    uOpacity: { value: 0.65 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uBlue: { value: new THREE.Color("#3f6bff") },
    uViolet: { value: new THREE.Color("#a65bd6") },
    uOrange: { value: new THREE.Color("#ff6a3a") }
  };

  var mat = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  var points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  /* ---------- sizing ---------- */
  function resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 0.8 ? 14 : 8; // keep scenes framed on portrait phones
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", function () { resize(); if (reduceMotion) draw(); });

  /* ---------- section in the middle of the screen → scene ---------- */
  function sceneFromScroll() {
    var mid = window.innerHeight / 2;
    var centers = anchors.map(function (el) {
      var r = el.getBoundingClientRect();
      return r.top + r.height / 2 - mid; // <0 once its centre has passed the middle of the screen
    });
    if (centers[0] >= 0) return 0;
    for (var k = 0; k < centers.length - 1; k++) {
      if (centers[k] <= 0 && centers[k + 1] > 0) {
        var f = -centers[k] / (centers[k + 1] - centers[k]);
        // hold on a scene while its section is readable, glide in between
        var t = Math.min(1, Math.max(0, (f - 0.25) / 0.5));
        return k + t * t * (3 - 2 * t);
      }
    }
    return SCENES - 1;
  }

  /* ---------- pointer ---------- */
  var mx = 0, my = 0, tmx = 0, tmy = 0;
  window.addEventListener("pointermove", function (e) {
    tmx = (e.clientX / window.innerWidth - 0.5) * 2;
    tmy = -(e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  /* ---------- render loop (only while the wrapper is on screen) ---------- */
  var visible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { rootMargin: "100px" }).observe(wrap);
  }

  var clock = new THREE.Clock();
  var currentU = sceneFromScroll();

  function draw() {
    uniforms.uProgress.value = currentU;
    renderer.render(scene, camera);
  }

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    var dt = Math.min(clock.getDelta(), 0.05);
    uniforms.uTime.value += dt;

    currentU += (sceneFromScroll() - currentU) * Math.min(1, dt * 4.2);

    mx += (tmx - mx) * 0.05;
    my += (tmy - my) * 0.05;
    uniforms.uMouse.value.set(mx, my);
    camera.position.x = mx * 0.25;
    camera.position.y = my * 0.15;
    camera.lookAt(0, 0, 0);

    draw();
  }

  if (reduceMotion) {
    // no idle animation: just re-draw the right shape when the page scrolls
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { currentU = sceneFromScroll(); draw(); ticking = false; });
    }, { passive: true });
    draw();
  } else {
    requestAnimationFrame(frame);
  }
})();
