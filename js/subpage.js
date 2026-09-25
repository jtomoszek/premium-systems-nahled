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

  /* ── Přišpendlená scrollytelling sekce ──────── */
  const procSection = document.querySelector(".proc-scroll");
  let procStart = 0;
  let procSpan = 1;

  function measure() {
    if (!procSection) return;
    const r = procSection.getBoundingClientRect();
    procStart = r.top + window.scrollY;
    procSpan = Math.max(1, procSection.offsetHeight - window.innerHeight);
  }
  window.addEventListener("resize", measure);
  window.addEventListener("load", measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  measure();

  function procProgress() {
    return Math.min(1, Math.max(0, (window.scrollY - procStart) / procSpan));
  }

  // Průběh videa z "virtuálního" scrollu bez přišpendleného úseku —
  // Země se během něj zastaví a za ním plynule naváže.
  function scrollProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const y = window.scrollY;
    const pinned = procSection ? Math.min(procSpan, Math.max(0, y - procStart)) : 0;
    const virtualMax = Math.max(1, max - (procSection ? procSpan : 0));
    return Math.min(1, Math.max(0, (y - pinned) / virtualMax));
  }

  // Plynulé rozmazání pozadí kolem přišpendlené zóny — v obou směrech.
  let lastBlur = -1;
  function updateBlur() {
    if (!procSection) return;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const leadIn = vh * 0.9;
    const leadOut = vh * 0.9;
    const rampIn = Math.min(1, Math.max(0, (y - (procStart - leadIn)) / leadIn));
    const rampOut = 1 - Math.min(1, Math.max(0, (y - (procStart + procSpan)) / leadOut));
    const f = Math.min(rampIn, rampOut);
    if (Math.abs(f - lastBlur) < 0.01) return;
    lastBlur = f;
    if (f <= 0.005) {
      video.style.filter = "";
    } else {
      video.style.filter =
        "blur(" + (f * 22).toFixed(1) + "px) brightness(" + (1 - f * 0.45).toFixed(3) +
        ") saturate(" + (1 - f * 0.2).toFixed(3) + ")";
    }
  }

  // Sloupce naskakují postupně a jejich linky se plní jedna po druhé —
  // vše řízené čistě pozicí scrollu, dopředu i pozpátku.
  const principles = Array.from(document.querySelectorAll(".principle"));
  const fills = principles.map((card) => card.querySelector(".p-fill"));
  const nP = principles.length;
  let lastProcProg = -1;

  function updateProc() {
    if (!nP) return;
    const p = procProgress();
    if (p === lastProcProg) return;
    lastProcProg = p;
    const span = nP > 1 ? 0.64 / (nP - 1) : 0;
    principles.forEach((card, i) => {
      const rs = 0.04 + i * span;
      const t = Math.min(1, Math.max(0, (p - rs) / 0.16));
      const e = t * t * (3 - 2 * t);
      card.style.opacity = e.toFixed(3);
      card.style.transform = "translateY(" + (44 * (1 - e)).toFixed(1) + "px)";
      const f = Math.min(1, Math.max(0, (p - (rs + 0.06)) / 0.18));
      fills[i].style.transform = "scaleX(" + (f * f * (3 - 2 * f)).toFixed(4) + ")";
      card.classList.toggle("active", f >= 0.98);
    });
  }

  // Fotka v .team-panel vyrůstá zespodu při skrolování (jako CEO na homepage)
  const growPanel = document.querySelector(".team-panel");
  const growImg = growPanel ? growPanel.querySelector("img") : null;
  let lastGrow = -1;

  function updateGrow() {
    if (!growImg) return;
    const r = growPanel.getBoundingClientRect();
    const vh = window.innerHeight;
    if (r.bottom < -80 || r.top > vh + 80) return;
    const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
    const shift = 26 * Math.pow(1 - p, 1.15);
    if (Math.abs(shift - lastGrow) < 0.05) return;
    lastGrow = shift;
    growImg.style.transform = "translateY(" + shift.toFixed(2) + "%)";
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
    updateBlur();
    updateProc();
    updateGrow();
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
