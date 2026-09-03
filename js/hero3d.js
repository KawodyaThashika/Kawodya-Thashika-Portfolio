/* =========================================================
   HERO 3D — animated 3D scene for the hero section (Three.js)
   A slowly rotating wireframe core surrounded by a floating
   node network, tinted with the site's accent colours and
   fully theme + reduced-motion aware.
   ========================================================= */
(function () {
  "use strict";

  var mount = document.getElementById("hero3d");
  if (!mount || typeof THREE === "undefined") return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isSmall = window.innerWidth < 720;

  /* ---------- colour helpers (read live CSS custom properties) ---------- */
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function colorOf(name, fallback) {
    var v = cssVar(name);
    try { return new THREE.Color(v || fallback); }
    catch (e) { return new THREE.Color(fallback); }
  }

  /* ---------- renderer / scene / camera ---------- */
  var renderer = new THREE.WebGLRenderer({
    canvas: mount,
    alpha: true,
    antialias: true,
    powerPreference: "low-power"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2));

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  var group = new THREE.Group();
  scene.add(group);

  /* ---------- core wireframe geometry ---------- */
  var accent = colorOf("--accent", "#2454E8");
  var accent2 = colorOf("--accent-2", "#E8A93A");

  var coreGeo = new THREE.IcosahedronGeometry(2.3, 1);
  var coreEdges = new THREE.EdgesGeometry(coreGeo);
  var coreMat = new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.55 });
  var core = new THREE.LineSegments(coreEdges, coreMat);
  group.add(core);

  var innerGeo = new THREE.IcosahedronGeometry(1.35, 0);
  var innerMat = new THREE.MeshBasicMaterial({ color: accent2, wireframe: true, transparent: true, opacity: 0.5 });
  var inner = new THREE.Mesh(innerGeo, innerMat);
  group.add(inner);

  /* ---------- floating node network ---------- */
  var NODE_COUNT = isSmall ? 26 : 42;
  var RADIUS = 4.6;
  var nodePositions = [];
  for (var i = 0; i < NODE_COUNT; i++) {
    var v = new THREE.Vector3(
      (Math.random() * 2 - 1),
      (Math.random() * 2 - 1),
      (Math.random() * 2 - 1)
    ).normalize().multiplyScalar(RADIUS * (0.55 + Math.random() * 0.55));
    nodePositions.push(v);
  }

  var pointsGeo = new THREE.BufferGeometry();
  var pointsArr = new Float32Array(NODE_COUNT * 3);
  nodePositions.forEach(function (v, idx) {
    pointsArr[idx * 3] = v.x;
    pointsArr[idx * 3 + 1] = v.y;
    pointsArr[idx * 3 + 2] = v.z;
  });
  pointsGeo.setAttribute("position", new THREE.BufferAttribute(pointsArr, 3));
  var pointsMat = new THREE.PointsMaterial({ color: accent2, size: 0.09, transparent: true, opacity: 0.9, sizeAttenuation: true });
  var nodes = new THREE.Points(pointsGeo, pointsMat);
  group.add(nodes);

  /* connect nearby nodes with faint lines to read as a "network" */
  var LINK_DIST = 2.1;
  var linkVerts = [];
  for (var a = 0; a < nodePositions.length; a++) {
    for (var b = a + 1; b < nodePositions.length; b++) {
      if (nodePositions[a].distanceTo(nodePositions[b]) < LINK_DIST) {
        linkVerts.push(nodePositions[a].x, nodePositions[a].y, nodePositions[a].z);
        linkVerts.push(nodePositions[b].x, nodePositions[b].y, nodePositions[b].z);
      }
    }
  }
  var linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(linkVerts), 3));
  var linkMat = new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.18 });
  var links = new THREE.LineSegments(linkGeo, linkMat);
  group.add(links);

  group.rotation.x = 0.15;
  group.rotation.y = -0.3;

  /* ---------- theme change support ---------- */
  var themeObserver = new MutationObserver(function () {
    accent = colorOf("--accent", "#2454E8");
    accent2 = colorOf("--accent-2", "#E8A93A");
    coreMat.color = accent;
    innerMat.color = accent2;
    pointsMat.color = accent2;
    linkMat.color = accent;
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  /* ---------- sizing ---------- */
  var heroSection = mount.closest(".hero") || mount.parentElement;

  function resize() {
    var w = heroSection.clientWidth || window.innerWidth;
    var h = heroSection.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  /* ---------- gentle mouse parallax (fine pointers only) ---------- */
  var targetRotX = group.rotation.x;
  var targetRotY = group.rotation.y;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (fine && !reduceMotion) {
    heroSection.addEventListener("mousemove", function (e) {
      var rect = heroSection.getBoundingClientRect();
      var nx = (e.clientX - rect.left) / rect.width - 0.5;
      var ny = (e.clientY - rect.top) / rect.height - 0.5;
      targetRotY = -0.3 + nx * 0.6;
      targetRotX = 0.15 + ny * 0.4;
    });
  }

  /* ---------- animation loop ---------- */
  var clock = new THREE.Clock();

  function renderStaticFrame() {
    resize();
    renderer.render(scene, camera);
  }

  if (reduceMotion) {
    renderStaticFrame();
    return; // no continuous animation for reduced-motion users
  }

  function animate() {
    requestAnimationFrame(animate);
    var t = clock.getElapsedTime();

    group.rotation.y += (targetRotY + t * 0.05 - group.rotation.y) * 0.04;
    group.rotation.x += (targetRotX - group.rotation.x) * 0.04;

    core.rotation.z = Math.sin(t * 0.15) * 0.1;
    inner.rotation.y -= 0.004;
    inner.rotation.x += 0.002;
    nodes.rotation.y += 0.0015;

    renderer.render(scene, camera);
  }
  animate();

  /* pause rendering while the hero is off-screen to save battery */
  if ("IntersectionObserver" in window) {
    var visible = true;
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }, { threshold: 0 }).observe(heroSection);

    var rafId = null;
    var originalAnimate = animate;
    // simple guard: skip render calls when not visible
    var origRender = renderer.render.bind(renderer);
    renderer.render = function (s, c) {
      if (visible) origRender(s, c);
    };
  }
})();
