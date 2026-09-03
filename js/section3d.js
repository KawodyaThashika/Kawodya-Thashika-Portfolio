/* =========================================================
   SECTION 3D BADGES
   A tiny, formal 3D wireframe animation next to every section
   label — a different shape per section, tinted to match that
   section's existing label colour. Each badge plays a short
   "assemble" animation the first time it scrolls into view,
   then settles into a slow, quiet idle rotation.
   ========================================================= */
(function () {
  "use strict";

  if (typeof THREE === "undefined") return;

  var canvases = document.querySelectorAll(".section-3d");
  if (!canvases.length) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  /* ---------- geometry builders, one per data-shape ---------- */
  function buildShape(kind) {
    var group = new THREE.Group();
    var geo;

    switch (kind) {
      case "octahedron":
        geo = new THREE.OctahedronGeometry(1, 0);
        group.add(wire(geo));
        break;

      case "torus":
        geo = new THREE.TorusGeometry(0.78, 0.26, 8, 22);
        group.add(wire(geo));
        break;

      case "dodecahedron":
        geo = new THREE.DodecahedronGeometry(1, 0);
        group.add(wire(geo));
        break;

      case "tetrahedron":
        geo = new THREE.TetrahedronGeometry(1.15, 0);
        group.add(wire(geo));
        break;

      case "cone":
        geo = new THREE.ConeGeometry(0.85, 1.5, 6);
        group.add(wire(geo));
        break;

      case "sphere":
        geo = new THREE.IcosahedronGeometry(1, 1);
        group.add(wire(geo));
        break;

      case "cubegrid":
        var half = 0.62;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (p) {
          var box = new THREE.BoxGeometry(0.62, 0.62, 0.62);
          var m = wire(box);
          m.position.set(p[0] * half, p[1] * half, 0);
          group.add(m);
        });
        break;

      default:
        geo = new THREE.IcosahedronGeometry(1, 0);
        group.add(wire(geo));
    }
    return group;
  }

  function wire(geo) {
    var edges = new THREE.EdgesGeometry(geo);
    var mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
    return new THREE.LineSegments(edges, mat);
  }

  function tintGroup(group, color) {
    group.traverse(function (obj) {
      if (obj.material) obj.material.color = color;
    });
  }

  /* ---------- build one tiny scene per canvas ---------- */
  canvases.forEach(function (canvas) {
    var label = canvas.closest(".section-label");
    var shapeKind = canvas.getAttribute("data-shape") || "icosahedron";

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(pixelRatio);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
    camera.position.set(0, 0, 4.2);

    var shape = buildShape(shapeKind);
    scene.add(shape);

    function currentColor() {
      var c = label ? getComputedStyle(label).color : "rgb(36,84,232)";
      return new THREE.Color(c);
    }
    tintGroup(shape, currentColor());

    function resize() {
      var w = canvas.clientWidth || 34;
      var h = canvas.clientHeight || 34;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener("resize", resize);

    /* re-tint whenever the theme flips */
    new MutationObserver(function () {
      tintGroup(shape, currentColor());
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    /* ---------- entrance animation + idle spin ---------- */
    var played = false;
    var visible = false;
    var start = null;
    var ENTRANCE_MS = 900;

    shape.scale.setScalar(reduceMotion ? 1 : 0.001);
    shape.rotation.set(0.4, -0.6, 0);
    renderer.render(scene, camera);

    function easeOutBack(t) {
      var c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    function frame(now) {
      if (!visible) return;
      if (start === null) start = now;
      var t = Math.min(1, (now - start) / ENTRANCE_MS);
      var eased = easeOutBack(t);

      shape.scale.setScalar(Math.max(0.001, eased));
      shape.rotation.y = -0.6 + eased * Math.PI * 0.9;
      shape.rotation.x = 0.4 - eased * 0.3;

      renderer.render(scene, camera);

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        played = true;
        idle();
      }
    }

    var idleId = null;
    function idle() {
      if (reduceMotion) return;
      shape.rotation.y += 0.0035;
      shape.rotation.x += 0.0012;
      renderer.render(scene, camera);
      idleId = requestAnimationFrame(idle);
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          visible = entry.isIntersecting;
          if (visible && !played) {
            if (reduceMotion) {
              shape.scale.setScalar(1);
              renderer.render(scene, camera);
              played = true;
            } else {
              start = null;
              requestAnimationFrame(frame);
            }
          } else if (visible && played && !reduceMotion && idleId === null) {
            idle();
          } else if (!visible && idleId !== null) {
            cancelAnimationFrame(idleId);
            idleId = null;
          }
        });
      }, { threshold: 0.35 }).observe(canvas);
    } else {
      shape.scale.setScalar(1);
      renderer.render(scene, camera);
    }
  });
})();
