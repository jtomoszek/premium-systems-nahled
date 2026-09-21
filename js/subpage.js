/* ═══════════════════════════════════════════════
   PREMIUM SYSTEMS — podstránky (sdílené interakce)
   ═══════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ── Scroll-driven video background ─────────── */
  const video = document.getElementById("bgVideo");
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const videoSrc = isMobile
    ? video.getAttribute("data-src-mobile")
    : video.getAttribute("data-src-desktop");
  video.src = videoSrc;
  video.load();

  // Stáhneme video celé do paměti a přepneme na blob — seeky pak běží
  // čistě lokálně, plynule a bez ohledu na podporu Range requestů serverem.
  fetch(videoSrc)
    .then((r) => (r.ok ? r.blob() : Promise.reject(r.status)))
    .then((blob) => {
      video.src = URL.createObjectURL(blob);
      video.load();
    })
    .catch(() => { /* zůstane streamovaná verze */ });

  let videoDuration = 0;
  let currentTime = 0;
  let targetTime = 0;
  let seekBusy = false;

  video.addEventListener("loadedmetadata", () => {
    videoDuration = video.duration;
    seekBusy = false;
  });
  video.addEventListener("seeked", () => {
    seekBusy = false;
  });

  function scrollProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  }

  function tick() {
    if (videoDuration > 0 && video.readyState >= 2) {
      if (seekBusy && !video.seeking) seekBusy = false;
      targetTime = scrollProgress() * (videoDuration - 0.1);
      currentTime += (targetTime - currentTime) * 0.14;
      if (!seekBusy && !video.seeking && Math.abs(video.currentTime - currentTime) > 0.02) {
        seekBusy = true;
        try {
          video.currentTime = currentTime;
        } catch (e) {
          seekBusy = false;
        }
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* ── Scroll progress bar + nav state ────────── */
  const bar = document.getElementById("scrollBar");
  const nav = document.getElementById("nav");
  function onScroll() {
    bar.style.width = (scrollProgress() * 100).toFixed(2) + "%";
    nav.classList.toggle("scrolled", window.scrollY > 40);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ── Mobile menu ────────────────────────────── */
  const burger = document.getElementById("navBurger");
  const links = document.getElementById("navLinks");
  burger.addEventListener("click", () => {
    burger.classList.toggle("open");
    links.classList.toggle("open");
  });
  links.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      burger.classList.remove("open");
      links.classList.remove("open");
    })
  );

  /* ── Reveal on scroll ───────────────────────── */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* ── Indikátor sekcí vlevo ──────────────────── */
  const sideLinks = Array.from(document.querySelectorAll("#sideNav a"));
  const sideSections = sideLinks.map((a) =>
    document.getElementById(a.getAttribute("data-section"))
  );
  const BAR_WIDTHS = [46, 28, 18, 11];
  let sideTops = [];
  let lastSideActive = -1;

  function measureSide() {
    sideTops = sideSections.map((s) => s.getBoundingClientRect().top + window.scrollY);
    lastSideActive = -1;
  }
  window.addEventListener("resize", measureSide);
  window.addEventListener("load", measureSide);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureSide);
  measureSide();

  function updateSideNav() {
    const ref = window.scrollY + window.innerHeight * 0.45;
    let active = 0;
    for (let i = 0; i < sideTops.length; i++) {
      if (sideTops[i] <= ref) active = i;
    }
    if (active === lastSideActive) return;
    lastSideActive = active;
    sideLinks.forEach((a, i) => {
      const d = Math.min(Math.abs(i - active), BAR_WIDTHS.length - 1);
      a.querySelector(".bar").style.width = BAR_WIDTHS[d] + "px";
      a.classList.toggle("active", i === active);
    });
  }
  window.addEventListener("scroll", updateSideNav, { passive: true });
  updateSideNav();

  /* ── Rok v patičce ──────────────────────────── */
  document.getElementById("year").textContent = new Date().getFullYear();
})();
