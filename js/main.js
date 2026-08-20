(function(){
  "use strict";

  /* ---------- mobile nav (original behaviour) ---------- */
  var header = document.getElementById("siteHeader");
  var toggle = document.getElementById("menuToggle");
  var nav = document.getElementById("navMenu");




  /* ---------- hero card hover movement ---------- */

var heroCard = document.querySelector(".hero-card");

if (heroCard && fine && !reduceMotion) {

  heroCard.addEventListener("mousemove", function(e) {

    var rect = heroCard.getBoundingClientRect();

    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;

    var centerX = rect.width / 2;
    var centerY = rect.height / 2;

    var rotateX = ((y - centerY) / centerY) * -1.5;
    var rotateY = ((x - centerX) / centerX) * 1.5;

    heroCard.style.transform =
      "translateY(-5px) perspective(800px) rotateX(" +
      rotateX +
      "deg) rotateY(" +
      rotateY +
      "deg)";
  });

  heroCard.addEventListener("mouseleave", function() {

    heroCard.style.transform =
      "translateY(0) perspective(800px) rotateX(0deg) rotateY(0deg)";
  });
} 






  /* =========================================
   SUBTLE CURSOR FOLLOW
   ========================================= */

const cursor = document.querySelector(".custom-cursor");

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

let cursorX = mouseX;
let cursorY = mouseY;

document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

function animateCursor() {
    // Smooth follow
    cursorX += (mouseX - cursorX) * 0.18;
    cursorY += (mouseY - cursorY) * 0.18;

    cursor.style.left = `${cursorX}px`;
    cursor.style.top = `${cursorY}px`;

    requestAnimationFrame(animateCursor);
}

animateCursor();


const interactiveElements = document.querySelectorAll(
    "a, button, input, textarea, select"
);

interactiveElements.forEach((element) => {

    element.addEventListener("mouseenter", () => {
        cursor.style.width = "8px";
        cursor.style.height = "8px";
        cursor.style.opacity = "0.7";
        cursor.style.boxShadow =
            "0 0 8px rgba(255,255,255,0.2)";
    });

    element.addEventListener("mouseleave", () => {
        cursor.style.width = "6px";
        cursor.style.height = "6px";
        cursor.style.opacity = "0.55";
        cursor.style.boxShadow =
            "0 0 6px rgba(255,255,255,0.18), 0 0 14px rgba(255,255,255,0.08)";
    });

});

  toggle.addEventListener("click", function(){
    nav.classList.toggle("open");
    toggle.innerHTML = nav.classList.contains("open")
      ? '<i class="bi bi-x-lg"></i>'
      : '<i class="bi bi-list"></i>';
  });
  nav.querySelectorAll("a").forEach(function(a){
    a.addEventListener("click", function(){
      nav.classList.remove("open");
      toggle.innerHTML = '<i class="bi bi-list"></i>';
    });
  });
  window.addEventListener("scroll", function(){
    header.style.boxShadow = window.scrollY > 20 ? "0 8px 25px rgba(0,0,0,.12)" : "none";
  });
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- theme toggle (light / dark) ---------- */
  var root = document.documentElement;
  var themeBtn = document.getElementById("themeToggle");
  var themeIcon = document.getElementById("themeIcon");

  function currentTheme(){
    return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }
  function paintIcon(theme){
    themeIcon.className = theme === "dark" ? "bi bi-sun" : "bi bi-moon-stars";
  }
  paintIcon(currentTheme());

  themeBtn.addEventListener("click", function(){
    var next = currentTheme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    paintIcon(next);
    try{ localStorage.setItem("kt-theme", next); }catch(e){}
  });

  /* ---------- scroll reveal ---------- */
  var revealItems = document.querySelectorAll(".reveal");
  if("IntersectionObserver" in window && revealItems.length){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    revealItems.forEach(function(el){ io.observe(el); });
  } else {
    revealItems.forEach(function(el){ el.classList.add("in-view"); });
  }

  /* ---------- project filter tabs ---------- */
  var filterTabs = document.getElementById("filterTabs");
  var activeFilter = "all";
  if(filterTabs){
    var tabs = filterTabs.querySelectorAll(".filter-tab");
    var emptyMsg = document.getElementById("filterEmpty");

    var applyFilter = function(filter){
      var cards = document.querySelectorAll("#projectGrid .project-card:not(.project-extra)");
      var visibleCount = 0;
      cards.forEach(function(card){
        var match = filter === "all" || card.getAttribute("data-category") === filter;
        card.classList.toggle("is-hidden", !match);
        if(match) visibleCount++;
      });
      if(emptyMsg) emptyMsg.hidden = visibleCount !== 0;
    };

    filterTabs.addEventListener("click", function(e){
      var btn = e.target.closest(".filter-tab");
      if(!btn) return;
      tabs.forEach(function(t){
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");

      activeFilter = btn.getAttribute("data-filter");
      applyFilter(activeFilter);
    });
  }

  /* ---------- show more projects ---------- */
  var loadMoreBtn = document.getElementById("loadMoreProjects");
  if(loadMoreBtn){
    loadMoreBtn.addEventListener("click", function(){
      var extraCards = document.querySelectorAll("#projectGrid .project-card.project-extra");
      extraCards.forEach(function(card){
        card.classList.remove("project-extra");
        var match = activeFilter === "all" || card.getAttribute("data-category") === activeFilter;
        card.classList.toggle("is-hidden", !match);
      });
      loadMoreBtn.textContent = "All projects shown";
      loadMoreBtn.classList.add("is-done");
      loadMoreBtn.disabled = true;
    });
  }

  /* ---------- drafting cursor: crosshair + live coordinates ---------- */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if(fine && !reduceMotion){
    document.body.classList.add("has-fine-pointer");
    var ring = document.getElementById("cursorRing");
    var coords = document.getElementById("cursorCoords");
    var targetX = 0, targetY = 0, curX = 0, curY = 0, primed = false;

    window.addEventListener("pointermove", function(e){
      targetX = e.clientX;
      targetY = e.clientY;
      if(!primed){ curX = targetX; curY = targetY; primed = true; }
      coords.textContent = "X" + Math.round(e.clientX).toString().padStart(3,"0") +
                            " Y" + Math.round(e.clientY).toString().padStart(3,"0");
    }, { passive: true });

    document.addEventListener("mouseleave", function(){ ring.style.opacity = "0"; });
    document.addEventListener("mouseenter", function(){ if(primed) ring.style.opacity = ""; });

    function raf(){
      curX += (targetX - curX) * 0.18;
      curY += (targetY - curY) * 0.18;
      ring.style.transform = "translate(" + curX + "px," + curY + "px)";
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }
})();
