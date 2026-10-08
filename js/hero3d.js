/* =========================================================
   HERO 3D — particle swarm that morphs on a loop for the hero
   ring → helix → wave → vortex → galaxy → (back to ring)
   Same swarm look as the rest of the page (js/bg3d.js), but
   driven by time. On scroll it melts into the ring that opens
   the page background (js/bg3d.js), so hero → SEC. 01 reads as
   one continuous morph. Theme + reduced-motion aware, pauses
   while the hero is off-screen.
   Pure Three.js (r128, already loaded by index.html).
   ========================================================= */
(function () {
  "use strict";

  var mount = document.getElementById("hero3d");
  if (!mount || typeof THREE === "undefined") return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isSmall = window.innerWidth < 720;
  var COUNT = isSmall ? 11000 : 24000; // same as bg3d.js so the exit ring matches it
  var SCENES = 5;            // ring, helix, wave, vortex, galaxy
  var HOLD = 3.4;            // seconds a shape stays formed
  var MORPH = 2.2;           // seconds to flow into the next one
  var PERIOD = HOLD + MORPH;

  /* ---------- renderer ---------- */
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: mount, alpha: true, antialias: false, powerPreference: "high-performance" });
  } catch (e) { return; }
  var DPR = Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 8);

  /* ---------- seeded random so shapes are stable between loads ---------- */
  var seed = 1337; // same seed as bg3d.js
  function rnd() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  /* ---------- target shapes ---------- */
  var T = [];
  for (var s = 0; s < SCENES; s++) T.push(new Float32Array(COUNT * 3));
  var aRand = new Float32Array(COUNT);
  var aDir = new Float32Array(COUNT * 3);

  function set(arr, i, x, y, z) { arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z; }

  for (var i = 0; i < COUNT; i++) {
    var r1 = rnd(), r2 = rnd(), r3 = rnd(), r4 = rnd();
    aRand[i] = r1;

    // random unit vector: scatters particles while they travel between shapes
    var th = r2 * Math.PI * 2, ph = Math.acos(2 * r3 - 1);
    set(aDir, i, Math.sin(ph) * Math.cos(th), Math.sin(ph) * Math.sin(th), Math.cos(ph));

    /* 0 — ring: identical to the ring behind SEC. 01 (bg3d.js) */
    var a0 = r1 * Math.PI * 2;
    var rad0 = 2.9 + Math.sin(a0 * 7 + r3 * 0.4) * 0.15 + Math.sin(a0 * 13) * 0.07 + (r4 - 0.5) * 0.1;
    var depth0 = (Math.floor(r2 * 46) / 46 - 0.5) * 2.8;
    set(T[0], i, Math.cos(a0) * rad0, Math.sin(a0) * rad0, depth0 - 1.2);

    /* 1 — DNA double helix with rungs */
    var y2 = (r2 - 0.5) * 6.4;
    var turn = y2 * 2.5;
    var which = i % 7; // 0-2 strand A, 3-5 strand B, 6 rung
    var hr = 1.05;
    var x2, z2;
    if (which < 3) {
      x2 = Math.cos(turn) * hr; z2 = Math.sin(turn) * hr;
    } else if (which < 6) {
      x2 = Math.cos(turn + Math.PI) * hr; z2 = Math.sin(turn + Math.PI) * hr;
    } else {
      var yy = Math.round(y2 * 4) / 4;
      var tt = yy * 2.5;
      var k = r4 * 2 - 1;
      y2 = yy;
      x2 = Math.cos(tt) * hr * k; z2 = Math.sin(tt) * hr * k;
    }
    var fuzz = which === 6 ? 0.03 : 0.17;
    set(T[1], i, x2 + (r1 - 0.5) * fuzz, y2, z2 + (r3 - 0.5) * fuzz);

    /* 2 — wave field (flat; tilted toward the viewer in the shader) */
    var gx = (r1 - 0.5) * 8.4;
    var gz = (r2 - 0.5) * 6.4;
    var wy = Math.sin(gx * 0.7 + gz * 0.4) * 0.38 + Math.sin(gx * 1.4 - gz * 0.8) * 0.15 + Math.cos(gz * 0.9) * 0.2;
    set(T[2], i, gx, wy, gz);

    /* 3 — vortex funnelling into a black hole (flat; tilted in the shader) */
    var a4 = r1 * Math.PI * 2;
    var r4v = 0.7 + Math.pow(r2, 0.75) * 3.1;
    var funnel = -0.6 / Math.max(r4v - 0.4, 0.3);
    set(T[3], i, Math.cos(a4 + r4v * 0.45) * r4v, funnel + (r3 - 0.5) * 0.2, Math.sin(a4 + r4v * 0.45) * r4v);

    /* 4 — spiral galaxy + glowing orbits (flat; tilted in the shader) */
    var gx5, gz5, gy5;
    if (i % 5 === 0) {
      var ring = (i % 3) + 1;
      var oa = r1 * Math.PI * 2;
      var orad = 1.1 + ring * 0.55;
      gx5 = Math.cos(oa) * orad; gz5 = Math.sin(oa) * orad; gy5 = (r3 - 0.5) * 0.03;
    } else if (i % 9 === 1) {
      var ca = r1 * Math.PI * 2, cr = Math.pow(r2, 2.2) * 0.5;
      gx5 = Math.cos(ca) * cr; gz5 = Math.sin(ca) * cr; gy5 = (r3 - 0.5) * 0.12;
    } else {
      var arm = i % 2;
      var rr = Math.pow(r2, 1.6) * 3.2 + 0.06;
      var ang = arm * Math.PI + rr * 1.15 + (r1 - 0.5) * 0.7 * (1.2 - rr * 0.18);
      gx5 = Math.cos(ang) * rr; gz5 = Math.sin(ang) * rr;
      gy5 = (r3 - 0.5) * 0.18 * (1.3 - rr * 0.22);
    }
    set(T[4], i, gx5, gy5, gz5);
  }

  /* ---------- geometry ---------- */
  var geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(T[0], 3));
  for (var k2 = 0; k2 < SCENES; k2++) geo.setAttribute("t" + k2, new THREE.BufferAttribute(T[k2], 3));
  geo.setAttribute("aRand", new THREE.BufferAttribute(aRand, 1));
  geo.setAttribute("aDir", new THREE.BufferAttribute(aDir, 3));

  /* ---------- shaders ---------- */
  var vert = [
    "attribute vec3 t0; attribute vec3 t1; attribute vec3 t2; attribute vec3 t3; attribute vec3 t4;",
    "attribute float aRand; attribute vec3 aDir;",
    "uniform float uProgress; uniform float uTime; uniform float uSize; uniform vec2 uMouse; uniform float uExit;",
    "varying vec3 vPos; varying float vAlpha; varying float vHeat; varying float vRand;",

    "float tri(float k, float u) { return smoothstep(0.0, 1.0, max(0.0, 1.0 - abs(u - k))); }",

    "void main() {",
    // each particle runs a little ahead/behind mid-transition, so the morph reads as a swarm
    "  float fr = fract(uProgress);",
    "  float k4 = 4.0 * fr * (1.0 - fr);",
    "  float u = clamp(uProgress + (aRand - 0.5) * 0.9 * k4, 0.0, 5.0);",
    // scene 5 is scene 0 again, so the loop closes seamlessly
    "  float w0 = tri(0.0, u) + tri(5.0, u);",
    "  float w1 = tri(1.0, u), w2 = tri(2.0, u), w3 = tri(3.0, u), w4 = tri(4.0, u);",
    "  vec3 p = t0 * w0 + t1 * w1 + t2 * w2 + t3 * w3 + t4 * w4;",

    // scatter while travelling
    "  float wmax = max(max(max(w0, w1), max(w2, w3)), w4);",
    "  float tr = clamp((1.0 - wmax) * 2.0, 0.0, 1.0);",
    "  p += aDir * tr * (1.0 + aRand * 2.0);",

    // gentle idle motion per scene
    "  float ripple = sin(uTime * 1.1 + p.x * 1.6 + p.y * 1.2) * 0.06;",
    "  p += vec3(ripple) * (w0 * 1.5 + w1 * 0.4 + w4 * 0.3);",
    "  p.y += (sin(p.x * 0.8 + uTime * 1.0) * 0.28 + sin(p.x * 1.5 - p.z * 0.7 + uTime * 1.5) * 0.12) * w2;",
    "  p.xy *= 1.0 + sin(uTime * 0.9 + atan(p.y, p.x) * 5.0) * 0.012 * w0;",

    // spin around the vertical axis
    "  float ang = uTime * (0.45 * w1 + 0.16 * w2 + 0.24 * w3 + 0.13 * w4);",
    "  float cs = cos(ang), sn = sin(ang);",
    "  p.xz = vec2(cs * p.x - sn * p.z, sn * p.x + cs * p.z);",

    // tilt the flat wave / vortex / galaxy discs toward the viewer
    "  float tl = 0.5 * w2 + 0.78 * w3 + 0.42 * w4;",
    "  float ct = cos(tl), st = sin(tl);",
    "  p.yz = vec2(ct * p.y - st * p.z, st * p.y + ct * p.z);",
    "  p.y += 0.25 * w3;",

    // scroll exit: every particle flows to its slot in the ring behind SEC. 01 (staggered, with a little scatter)
    "  vec3 pr = t0;",
    "  pr += vec3(sin(uTime * 1.1 + pr.x * 1.6 + pr.y * 1.2) * 0.06) * 1.5;",
    "  pr.xy *= 1.0 + sin(uTime * 0.9 + atan(pr.y, pr.x) * 5.0) * 0.012;",
    "  float ee = clamp(uExit * 1.7 - aRand * 0.7, 0.0, 1.0);",
    "  ee = ee * ee * (3.0 - 2.0 * ee);",
    "  p = mix(p, pr, ee);",
    "  p += aDir * (ee * (1.0 - ee)) * 4.0 * (0.5 + aRand);",

    // pointer parallax
    "  p.xy += uMouse * 0.35 * (0.4 + aRand * 0.6);",

    "  vPos = p;",
    "  vRand = aRand;",
    "  vHeat = w4 * (1.0 - smoothstep(0.0, 1.4, length(vec2(p.x, p.y * 3.0)))) * (1.0 - ee);",
    "  vAlpha = 0.45 + aRand * 0.55;",

    "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
    "  gl_Position = projectionMatrix * mv;",
    "  float sz = uSize * (0.55 + aRand * 0.9) * (1.0 + w3 * 0.15 + w2 * 0.2);",
    "  gl_PointSize = sz * (7.0 / -mv.z);",
    "}"
  ].join("\n");

  var frag = [
    "precision highp float;",
    "varying vec3 vPos; varying float vAlpha; varying float vHeat; varying float vRand;",
    "uniform vec3 uBlue; uniform vec3 uOrange; uniform vec3 uViolet; uniform vec3 uHeatCol; uniform float uOpacity; uniform float uStars;",
    "void main() {",
    "  vec2 c = gl_PointCoord - 0.5;",
    "  float d = length(c);",
    "  if (d > 0.5) discard;",
    "  float soft = smoothstep(0.5, 0.0, d);",
    // blue (lower-left) → violet → orange (upper-right)
    "  float g = clamp(vPos.x * 0.14 + vPos.y * 0.2 + 0.5, 0.0, 1.0);",
    "  vec3 col = g < 0.5 ? mix(uBlue, uViolet, g * 2.0) : mix(uViolet, uOrange, (g - 0.5) * 2.0);",
    "  col = mix(col, uHeatCol, vHeat);",
    "  col += vec3(0.25) * step(0.93, vRand) * uStars;",
    "  gl_FragColor = vec4(col, soft * vAlpha * uOpacity);",
    "}"
  ].join("\n");

  var uniforms = {
    uProgress: { value: 0 },
    uExit: { value: 0 },
    uTime: { value: 0 },
    uSize: { value: 2.8 * DPR },
    uOpacity: { value: 0.8 },
    uStars: { value: 1 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uBlue: { value: new THREE.Color("#3f6bff") },
    uViolet: { value: new THREE.Color("#a65bd6") },
    uOrange: { value: new THREE.Color("#ff6a3a") },
    uHeatCol: { value: new THREE.Color("#ffd19e") }
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

  /* ---------- theme: glowing additive swarm on dark, ink-like swarm on light ---------- */
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  var isDark = true;
  var baseOpacity = 0.8;
  function applyTheme() {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    isDark = dark;
    if (dark) {
      mat.blending = THREE.AdditiveBlending;
      uniforms.uBlue.value.set("#3f6bff");
      uniforms.uViolet.value.set("#a65bd6");
      uniforms.uOrange.value.set("#ff6a3a");
      uniforms.uHeatCol.value.set("#ffd19e");
      baseOpacity = 0.8;
      uniforms.uStars.value = 1;
    } else {
      mat.blending = THREE.NormalBlending;
      try { uniforms.uBlue.value.set(cssVar("--accent") || "#2454E8"); } catch (e) { uniforms.uBlue.value.set("#2454E8"); }
      try { uniforms.uOrange.value.set(cssVar("--accent-2") || "#E8A93A"); } catch (e) { uniforms.uOrange.value.set("#E8A93A"); }
      uniforms.uViolet.value.set("#7a3fc4");
      uniforms.uHeatCol.value.set("#E8A93A");
      baseOpacity = 0.85;
      uniforms.uStars.value = 0;
    }
    mat.needsUpdate = true;
    applyExit();
  }
  new MutationObserver(function () { applyTheme(); if (reduceMotion) draw(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  /* ---------- sizing: fixed, viewport-sized canvas (same framing as the page background) ---------- */
  var heroSection = mount.closest(".hero") || mount.parentElement;
  var baseX = 0, baseY = 0;

  function resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    renderer.setSize(w, h, false);
    var aspect = w / h;
    camera.aspect = aspect;
    camera.position.z = aspect < 0.8 ? 14 : 8; // same rule as bg3d.js
    camera.updateProjectionMatrix();

    // at the top of the page the swarm sits on the right (behind the profile card)
    var halfH = camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    var halfW = halfH * aspect;
    baseX = aspect >= 1.2 ? halfW * 0.24 : 0;
    baseY = aspect >= 1.2 ? halfH * 0.1 : 0;
    applyExit();
  }

  /* ---------- scroll exit: 0 = hero swarm, 1 = the ring that opens SEC. 01 ---------- */
  var exitCur = 0;
  var maskKey = -1;

  function exitTarget() {
    var h = heroSection.offsetHeight || window.innerHeight;
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    var f = Math.min(1, Math.max(0, (y / h - 0.06) / 0.72));
    return f;
  }

  function applyExit() {
    var e = exitCur;
    uniforms.uExit.value = e;

    // slide from the right-hand spot to the centre, where the page ring lives
    points.position.x = baseX * (1 - e);
    points.position.y = baseY * (1 - e);

    // blend look toward bg3d.js values so there is no visible seam
    var smallScreen = window.innerWidth <= 860;
    var cssBase = smallScreen ? 0.75 : 0.85;
    mount.style.opacity = (cssBase + (1 - cssBase) * e).toFixed(3);
    // phones on the light theme: ink-coloured dots are tiny on white, so make them bolder
    var lightBoost = (!isDark && smallScreen) ? 1.0 : 0.0;
    uniforms.uOpacity.value = isDark ? baseOpacity + (0.65 - baseOpacity) * e : (lightBoost ? 1.0 : baseOpacity);
    uniforms.uSize.value = DPR * (2.8 + (2.6 - 2.8) * e) * (lightBoost ? 1.7 : 1.0);

    // the soft vignette mask opens up as the swarm becomes the full-page background
    var key = Math.round(e * 200) + (smallScreen ? 1000 : 0);
    if (key !== maskKey) {
      maskKey = key;
      var m;
      if (e >= 0.995 || smallScreen) {
        m = "none"; // no mask on phones: mobile Safari can blank masked WebGL canvases
      } else {
        var cx = 62 - 12 * e, cy = 42 + 8 * e;
        var s1 = 45 + 120 * e, s2 = 78 + 160 * e;
        m = "radial-gradient(circle at " + cx.toFixed(1) + "% " + cy.toFixed(1) + "%, rgba(0,0,0,1) 0%, rgba(0,0,0,.85) " + s1.toFixed(1) + "%, rgba(0,0,0,0) " + s2.toFixed(1) + "%)";
      }
      mount.style.webkitMaskImage = m;
      mount.style.maskImage = m;
    }
  }

  applyTheme();
  resize();
  window.addEventListener("resize", function () { resize(); if (reduceMotion) draw(); });

  /* ---------- pointer (page-wide, like the background) ---------- */
  var mx = 0, my = 0, tmx = 0, tmy = 0;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (fine && !reduceMotion) {
    window.addEventListener("pointermove", function (e) {
      tmx = (e.clientX / window.innerWidth - 0.5) * 2;
      tmy = -(e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  /* ---------- timeline: hold a shape, then glide to the next ---------- */
  function progressAt(t) {
    var cyc = (t / PERIOD) % SCENES;       // 0 … 5, wraps back to the ring
    var idx = Math.floor(cyc);
    var local = (cyc - idx) * PERIOD;      // seconds inside this step
    var m = Math.min(1, Math.max(0, (local - HOLD) / MORPH));
    m = m * m * (3 - 2 * m);
    return idx + m;
  }

  var visible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      mount.style.visibility = visible ? "visible" : "hidden"; // keeps it from showing through transparent parts further down
    }, { threshold: 0 }).observe(heroSection);
  }

  var clock = new THREE.Clock();

  function draw() {
    renderer.render(scene, camera);
  }

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) { clock.getDelta(); return; }
    var dt = Math.min(clock.getDelta(), 0.05);
    uniforms.uTime.value += dt;
    uniforms.uProgress.value = progressAt(uniforms.uTime.value);

    exitCur += (exitTarget() - exitCur) * Math.min(1, dt * 4.2);
    if (Math.abs(exitTarget() - exitCur) < 0.0005) exitCur = exitTarget();
    applyExit();

    mx += (tmx - mx) * 0.05;
    my += (tmy - my) * 0.05;
    uniforms.uMouse.value.set(mx, my);
    camera.position.x = mx * 0.25;
    camera.position.y = my * 0.15;
    camera.lookAt(0, 0, 0);

    draw();
  }

  if (reduceMotion) {
    // no motion: a single still frame of the galaxy
    uniforms.uProgress.value = 4;
    uniforms.uTime.value = 2;
    exitCur = exitTarget();
    applyExit();
    draw();
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { exitCur = exitTarget(); applyExit(); draw(); ticking = false; });
    }, { passive: true });
  } else {
    requestAnimationFrame(frame);
  }
})();
