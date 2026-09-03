/* =========================================================
   SECTION LINE-FLOW
   A quiet, continuously-moving set of thin 3D wireframe threads
   drifting behind the copy of every content section (01–07).
   The hero (section 0) is untouched — this only targets the
   ".section-lines-3d" canvases placed inside sections 1-7.

   Sections 01-06 use the shared "weave" pattern: a soft flowing
   sine thread that gently rises above and dips below the text
   baseline as it drifts across the section.

   Section 07 (Contact) gets its own unique "helix" pattern: two
   colour-paired threads braided together, crossing over and
   under one another (and the copy) as they travel — a distinct,
   more elaborate closing visual, still formal, thin and small.

   Everything stays 3D (perspective camera + real depth), low
   opacity, and keeps animating continuously while its section
   is in view.
   ========================================================= */
(function () {
  "use strict";

  if (typeof THREE === "undefined") return;

  var canvases = document.querySelectorAll(".section-lines-3d");
  if (!canvases.length) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

  function rootColor(varName, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    try { return new THREE.Color(v || fallback); } catch (e) { return new THREE.Color(fallback); }
  }

  canvases.forEach(function (canvas) {
    var section = canvas.closest("section");
    if (!section) return;

    var variant = canvas.getAttribute("data-variant") || "weave";
    var label = section.querySelector(".section-label");

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(pixelRatio);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 1, 6000);

    var group = new THREE.Group();
    scene.add(group);

    var lines = [];
    var w = 0, h = 0;

    function currentColor() {
      var c = label ? getComputedStyle(label).color : "rgb(36,84,232)";
      try { return new THREE.Color(c); } catch (e) { return new THREE.Color(0x2454e8); }
    }

    function disposeLines() {
      lines.forEach(function (l) {
        group.remove(l.mesh);
        l.mesh.geometry.dispose();
        l.mesh.material.dispose();
      });
      lines = [];
    }

    function makeLine(positions, color, opacity, dashSize, gapSize) {
      var geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      var mat = new THREE.LineDashedMaterial({
        color: color,
        transparent: true,
        opacity: opacity,
        dashSize: dashSize,
        gapSize: gapSize,
        linewidth: 1
      });
      var mesh = new THREE.Line(geo, mat);
      mesh.computeLineDistances();
      group.add(mesh);
      return mesh;
    }

    /* ---------- variant: WEAVE (sections 01-06) ----------
       A handful of soft sine threads drifting across the
       section, rising above and dipping below the text line. */
    var WEAVE_COUNT = 5;
    var WEAVE_POINTS = 48;

    function buildWeave() {
      var color = currentColor();
      var marginX = Math.max(30, w * 0.035);

      for (var i = 0; i < WEAVE_COUNT; i++) {
        var t = (i + 1) / (WEAVE_COUNT + 1);
        var baseY = (t - 0.5) * h * 0.82;
        var depth = (i % 2 === 0 ? 1 : -1) * (50 + i * 22);
        var amp = 10 + (i % 3) * 6;
        var freq = 1.2 + i * 0.3;
        var phase = i * 1.9;
        var speed = 0.16 + (i % 3) * 0.05;

        var positions = new Float32Array(WEAVE_POINTS * 3);
        for (var p = 0; p < WEAVE_POINTS; p++) {
          var px = -w / 2 + marginX + (p / (WEAVE_POINTS - 1)) * (w - marginX * 2);
          positions[p * 3] = px;
          positions[p * 3 + 1] = baseY;
          positions[p * 3 + 2] = depth;
        }

        var mesh = makeLine(positions, color, 0.16 + (i % 2) * 0.05, 9, 6);

        lines.push({ mesh: mesh, positions: positions, baseY: baseY, amp: amp, freq: freq, phase: phase, speed: speed });
      }
    }

    function updateWeave(elapsed) {
      lines.forEach(function (l) {
        var pts = l.positions;
        var count = pts.length / 3;
        for (var p = 0; p < count; p++) {
          var xNorm = p / (count - 1);
          pts[p * 3 + 1] =
            l.baseY + Math.sin(xNorm * Math.PI * l.freq + elapsed * 0.55 + l.phase) * l.amp;
        }
        l.mesh.geometry.attributes.position.needsUpdate = true;
        l.mesh.computeLineDistances();
        l.mesh.material.dashOffset = -(elapsed * (12 + l.speed * 40));
      });
    }

    /* ---------- variant: HELIX (section 07 / Contact only) ----------
       Two colour-paired threads braided around a shared centre
       line, one tinted with --accent, the other with --accent-2.
       As they travel across the section each thread alternately
       rises above and dips below the other (and the copy),
       reading as a woven double-helix rather than a flat wave. */
    var HELIX_STRANDS = 2;
    var HELIX_ROWS = 3;
    var HELIX_POINTS = 72;

    function buildHelix() {
      var colorA = rootColor("--accent", "#2454e8");
      var colorB = rootColor("--accent-2", "#e8a93a");
      var marginX = Math.max(30, w * 0.045);

      for (var row = 0; row < HELIX_ROWS; row++) {
        var rt = (row + 1) / (HELIX_ROWS + 1);
        var rowY = (rt - 0.5) * h * 0.86;
        var amp = 20 + row * 5;
        var freq = 1.6 + row * 0.25;
        var speed = 0.5 + row * 0.08;
        var rowPhase = row * 2.1;

        for (var s = 0; s < HELIX_STRANDS; s++) {
          var strandPhase = s === 0 ? 0 : Math.PI;
          var color = s === 0 ? colorA : colorB;

          var positions = new Float32Array(HELIX_POINTS * 3);
          for (var p = 0; p < HELIX_POINTS; p++) {
            var px = -w / 2 + marginX + (p / (HELIX_POINTS - 1)) * (w - marginX * 2);
            positions[p * 3] = px;
            positions[p * 3 + 1] = rowY;
            positions[p * 3 + 2] = 0;
          }

          var mesh = makeLine(positions, color, 0.24, 7, 5);

          lines.push({
            mesh: mesh,
            positions: positions,
            baseY: rowY,
            amp: amp,
            freq: freq,
            phase: rowPhase + strandPhase,
            speed: speed
          });
        }
      }
    }

    function updateHelix(elapsed) {
      lines.forEach(function (l) {
        var pts = l.positions;
        var count = pts.length / 3;
        for (var p = 0; p < count; p++) {
          var xNorm = p / (count - 1);
          var ang = xNorm * Math.PI * l.freq + elapsed * l.speed + l.phase;
          /* vertical weave: crosses above/below the row's baseline */
          pts[p * 3 + 1] = l.baseY + Math.sin(ang) * l.amp;
          /* depth weave, out of phase with the vertical one, so the
             thread also swings toward/away from the camera as it
             crosses its partner strand — a true 3D braid rather
             than a flat up/down wiggle */
          pts[p * 3 + 2] = Math.cos(ang) * (l.amp * 1.1);
        }
        l.mesh.geometry.attributes.position.needsUpdate = true;
        l.mesh.computeLineDistances();
        l.mesh.material.dashOffset = -(elapsed * (16 + l.speed * 30));
      });
    }

    function build() {
      disposeLines();
      if (!w || !h) return;
      if (variant === "helix") buildHelix();
      else buildWeave();
    }

    function update(elapsed) {
      if (variant === "helix") updateHelix(elapsed);
      else updateWeave(elapsed);
    }

    function resize() {
      var nw = section.clientWidth;
      var nh = section.clientHeight;
      if (!nw || !nh) return;
      if (nw === w && nh === h) return;
      w = nw; h = nh;

      renderer.setSize(w, h, false);
      camera.aspect = w / h;

      var fovRad = (camera.fov * Math.PI) / 180;
      var dist = (h / 2) / Math.tan(fovRad / 2);
      camera.position.set(0, 0, dist);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();

      build();

      if (reduceMotion) renderer.render(scene, camera);
    }

    resize();

    if ("ResizeObserver" in window) {
      new ResizeObserver(resize).observe(section);
    } else {
      window.addEventListener("resize", resize);
    }

    /* re-tint whenever the theme flips */
    new MutationObserver(function () {
      if (variant === "helix") {
        var colorA = rootColor("--accent", "#2454e8");
        var colorB = rootColor("--accent-2", "#e8a93a");
        lines.forEach(function (l, idx) {
          l.mesh.material.color = idx % 2 === 0 ? colorA : colorB;
        });
      } else {
        var color = currentColor();
        lines.forEach(function (l) { l.mesh.material.color = color; });
      }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    var visible = false;
    var running = false;
    var t0 = null;

    function frame(now) {
      if (!visible) { running = false; return; }
      if (t0 === null) t0 = now;
      var elapsed = (now - t0) / 1000;

      update(elapsed);

      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }

    function startLoop() {
      if (reduceMotion) {
        renderer.render(scene, camera);
        return;
      }
      if (running) return;
      running = true;
      t0 = null;
      requestAnimationFrame(frame);
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            visible = entry.isIntersecting;
            if (visible) startLoop();
          });
        },
        { threshold: 0.05 }
      ).observe(section);
    } else {
      visible = true;
      startLoop();
    }
  });
})();
