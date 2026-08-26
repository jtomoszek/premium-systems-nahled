/* ═══════════════════════════════════════════════
   PREMIUM SYSTEMS — interactions
   ═══════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ── Scroll-driven video background ─────────── */
  const video = document.getElementById("bgVideo");
  const videoStage = document.querySelector(".video-stage");
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const videoSrc = isMobile
    ? "assets/video/earth-scrub-mobile.mp4"
    : "assets/video/earth-scrub.mp4";
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

  /* ── Scrollytelling sekce: measurements ─────── */
  const chartSection = document.querySelector(".chart-scroll");
  const procSection = document.querySelector(".proc-scroll");
  let chartStart = 0;
  let chartSpan = 1;
  let procStart = 0;
  let procSpan = 1;

  function measure() {
    const r1 = chartSection.getBoundingClientRect();
    chartStart = r1.top + window.scrollY;
    chartSpan = Math.max(1, chartSection.offsetHeight - window.innerHeight);
    const r2 = procSection.getBoundingClientRect();
    procStart = r2.top + window.scrollY;
    procSpan = Math.max(1, procSection.offsetHeight - window.innerHeight);
  }
  window.addEventListener("resize", measure);
  window.addEventListener("load", measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  measure();

  function chartProgress() {
    return Math.min(1, Math.max(0, (window.scrollY - chartStart) / chartSpan));
  }
  function procProgress() {
    return Math.min(1, Math.max(0, (window.scrollY - procStart) / procSpan));
  }

  // Průběh videa počítáme z "virtuálního" scrollu, ze kterého jsou vyjmuté
  // přišpendlené úseky scrollytellingu — Země se během nich zastaví
  // a za nimi plynule naváže.
  function scrollProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const y = window.scrollY;
    const pinned =
      Math.min(chartSpan, Math.max(0, y - chartStart)) +
      Math.min(procSpan, Math.max(0, y - procStart));
    const virtualMax = Math.max(1, max - chartSpan - procSpan);
    return Math.min(1, Math.max(0, (y - pinned) / virtualMax));
  }

  function tick() {
    if (videoDuration > 0 && video.readyState >= 2) {
      // pojistka: kdyby prohlížeč seek tiše zahodil, příznak se uvolní sám
      if (seekBusy && !video.seeking) seekBusy = false;
      targetTime = scrollProgress() * (videoDuration - 0.1);
      // plynulé dohánění cílového času (lerp) — video se posouvá se skrolováním
      currentTime += (targetTime - currentTime) * 0.14;
      // nový seek až po dokončení předchozího, jinak se seeky navzájem ruší
      // a video zůstane stát na prvním snímku (typicky v Safari)
      if (!seekBusy && !video.seeking && Math.abs(video.currentTime - currentTime) > 0.02) {
        seekBusy = true;
        try {
          video.currentTime = currentTime;
        } catch (e) {
          seekBusy = false;
        }
      }
    }
    updateChart();
    updateProc();
    updateCeo();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* ── Scroll progress bar + nav state ────────── */
  const bar = document.getElementById("scrollBar");
  const nav = document.getElementById("nav");
  function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = ((max > 0 ? window.scrollY / max : 0) * 100).toFixed(2) + "%";
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

  /* ── Graf: příběh dvou křivek ───────────────── */
  const VB_W = 1200;
  const VB_H = 520;
  const PAD_L = 20;
  const PAD_R = 20;
  const PAD_T = 30;
  const PAD_B = 20;
  const Y_MAX = 90; // miliony Kč
  const INCIDENT_T = 0.25;

  // klíčové body [pozice v čase 0–1, tržby v mil. Kč]
  // firma žije svůj život: obě rostou spolu, brzy přijde incident —
  // bez ochrany strmý pád a pomalé plazení, s ochranou jen zaváhání a růst dál
  const KEYS_WITH = [
    [0, 50], [0.1, 52.5], [0.18, 55], [0.25, 58], [0.32, 53.5],
    [0.42, 56.5], [0.58, 63], [0.78, 72], [1, 83.2],
  ];
  const KEYS_WITHOUT = [
    [0, 49.5], [0.1, 52], [0.18, 54.5], [0.25, 57.5], [0.31, 28],
    [0.39, 11], [0.52, 7.5], [0.7, 8.5], [0.85, 10], [1, 11.4],
  ];

  const xOf = (t) => PAD_L + t * (VB_W - PAD_L - PAD_R);
  const yOf = (v) => PAD_T + (1 - v / Y_MAX) * (VB_H - PAD_T - PAD_B);

  // Catmull-Rom vzorkování klíčových bodů na hustou hladkou křivku
  function sampleCurve(keys, n) {
    const pts = [];
    const get = (i) => keys[Math.min(keys.length - 1, Math.max(0, i))];
    for (let s = 0; s < n; s++) {
      const t = s / (n - 1);
      let i = keys.length - 2;
      for (let k = 0; k < keys.length - 1; k++) {
        if (t <= keys[k + 1][0]) { i = k; break; }
      }
      const [t0, t1] = [keys[i][0], keys[i + 1][0]];
      const u = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
      const p0 = get(i - 1)[1], p1 = keys[i][1], p2 = keys[i + 1][1], p3 = get(i + 2)[1];
      const u2 = u * u, u3 = u2 * u;
      const v = 0.5 * ((2 * p1) + (-p0 + p2) * u +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
      pts.push([t, Math.max(0.5, v)]);
    }
    return pts;
  }

  const N = 240;
  const curveWith = sampleCurve(KEYS_WITH, N);
  const curveWithout = sampleCurve(KEYS_WITHOUT, N);

  const toPath = (pts) =>
    pts.map(([t, v], i) => (i === 0 ? "M" : "L") + xOf(t).toFixed(1) + " " + yOf(v).toFixed(1)).join(" ");

  const lineWithEl = document.getElementById("lineWith");
  const lineWithoutEl = document.getElementById("lineWithout");
  const areaWithEl = document.getElementById("areaWith");
  const clipRect = document.getElementById("chartClipRect");
  const incidentLine = document.getElementById("incidentLine");
  const incidentText = document.getElementById("incidentText");
  const chartNote = document.getElementById("chartNote");
  const chartStage = document.querySelector(".chart-stage");
  const svgEl = document.getElementById("revChart");
  const badgeWith = document.getElementById("badgeWith");
  const badgeWithout = document.getElementById("badgeWithout");
  const valWith = document.getElementById("valWith");
  const valWithout = document.getElementById("valWithout");

  lineWithEl.setAttribute("d", toPath(curveWith));
  lineWithoutEl.setAttribute("d", toPath(curveWithout));
  areaWithEl.setAttribute(
    "d",
    toPath(curveWith) + " L" + xOf(1).toFixed(1) + " " + yOf(0) + " L" + xOf(0).toFixed(1) + " " + yOf(0) + " Z"
  );

  const incX = xOf(INCIDENT_T);
  incidentLine.setAttribute("x1", incX);
  incidentLine.setAttribute("x2", incX);
  incidentText.setAttribute("x", incX + 12);

  // mřížka + popisky osy Y
  const grid = document.getElementById("chartGrid");
  [20, 40, 60, 80].forEach((v) => {
    const y = yOf(v);
    const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
    ln.setAttribute("x1", PAD_L); ln.setAttribute("x2", VB_W - PAD_R);
    ln.setAttribute("y1", y); ln.setAttribute("y2", y);
    ln.setAttribute("stroke", "rgba(255,255,255,0.06)");
    ln.setAttribute("stroke-width", "1");
    grid.appendChild(ln);
    const tx = document.createElementNS("http://www.w3.org/2000/svg", "text");
    tx.setAttribute("x", VB_W - PAD_R); tx.setAttribute("y", y - 7);
    tx.setAttribute("text-anchor", "end");
    tx.setAttribute("fill", "rgba(159,176,195,0.4)");
    tx.setAttribute("font-size", "13");
    tx.textContent = v + " mil.";
    grid.appendChild(tx);
  });

  const fmtKc = (millions) => {
    const rounded = Math.round((millions * 1e6) / 100000) * 100000;
    return rounded.toLocaleString("cs-CZ") + " Kč";
  };

  const valueAt = (curve, t) => {
    const i = Math.min(N - 1, Math.max(0, Math.round(t * (N - 1))));
    return curve[i][1];
  };

  let lastProg = -1;
  let lastBlur = -1;

  // Plynulé rozmazávání pozadí: náběh před přišpendlenou zónou, plné
  // po celou její dobu a postupný návrat za ní — v obou směrech skrolování.
  function zoneFactor(start, span, leadIn, leadOut) {
    const y = window.scrollY;
    const rampIn = Math.min(1, Math.max(0, (y - (start - leadIn)) / Math.max(1, leadIn)));
    const rampOut = 1 - Math.min(1, Math.max(0, (y - (start + span)) / Math.max(1, leadOut)));
    return Math.min(rampIn, rampOut);
  }

  function updateBlur() {
    const vh = window.innerHeight;
    // u grafu začíná náběh krátce po začátku skrolování z úvodní obrazovky
    const fChart = zoneFactor(chartStart, chartSpan, Math.max(1, chartStart - vh * 0.15), vh * 0.9);
    const fProc = zoneFactor(procStart, procSpan, vh * 0.9, vh * 0.9);
    const f = Math.max(fChart, fProc);
    if (Math.abs(f - lastBlur) < 0.01) return;
    lastBlur = f;
    // blur jen na samotné video — zrno nad ním zůstává ostré a drží texturu
    if (f <= 0.005) {
      video.style.filter = "";
    } else {
      video.style.filter =
        "blur(" + (f * 22).toFixed(1) + "px) brightness(" + (1 - f * 0.45).toFixed(3) +
        ") saturate(" + (1 - f * 0.2).toFixed(3) + ")";
    }
  }

  function updateChart() {
    updateBlur();
    const prog = chartProgress();
    if (prog === lastProg) return;
    lastProg = prog;

    // odkrývání křivek zleva doprava
    const revealX = xOf(prog);
    clipRect.setAttribute("width", Math.max(0, revealX).toFixed(1));

    // incident se objeví, když ho křivky protnou
    const showInc = prog >= INCIDENT_T;
    incidentLine.setAttribute("opacity", showInc ? "0.7" : "0");
    incidentText.setAttribute("opacity", showInc ? "0.9" : "0");

    // závěrečná pointa
    chartNote.classList.toggle("show", prog > 0.93);

    // odznaky s tržbami sledují špičky křivek
    const active = prog > 0.03;
    badgeWith.classList.toggle("on", active);
    badgeWithout.classList.toggle("on", active);

    if (active) {
      const stageRect = chartStage.getBoundingClientRect();
      const svgRect = svgEl.getBoundingClientRect();
      const sx = svgRect.width / VB_W;
      const sy = svgRect.height / VB_H;
      const offX = svgRect.left - stageRect.left;
      const offY = svgRect.top - stageRect.top;

      const vWith = valueAt(curveWith, prog);
      const vWithout = valueAt(curveWithout, prog);
      valWith.textContent = fmtKc(vWith);
      valWithout.textContent = fmtKc(vWithout);

      const bx = Math.max(120, revealX * sx + offX);
      badgeWith.style.transform =
        "translate(" + bx + "px," + (yOf(vWith) * sy + offY) + "px) translate(-100%, -130%)";
      badgeWithout.style.transform =
        "translate(" + bx + "px," + (yOf(vWithout) * sy + offY) + "px) translate(-100%, 40%)";
    }
  }

  /* ── Proč PS: sloupce s linkami ─────────────── */
  const principles = Array.from(document.querySelectorAll(".principle"));
  const fills = principles.map((card) => card.querySelector(".p-fill"));
  let lastProcProg = -1;

  function updateProc() {
    const p = procProgress();
    if (p === lastProcProg) return;
    lastProcProg = p;

    const revealStarts = [0.04, 0.36, 0.68];
    const fillStarts = [0.1, 0.42, 0.74];
    principles.forEach((card, i) => {
      // sloupec se vynoří...
      const t = Math.min(1, Math.max(0, (p - revealStarts[i]) / 0.18));
      const e = t * t * (3 - 2 * t);
      card.style.opacity = e.toFixed(3);
      card.style.transform = "translateY(" + (44 * (1 - e)).toFixed(1) + "px)";
      // ...a jeho linka se vzápětí naplní přes tečkované pozadí
      const f = Math.min(1, Math.max(0, (p - fillStarts[i]) / 0.24));
      fills[i].style.transform = "scaleX(" + (f * f * (3 - 2 * f)).toFixed(4) + ")";
      card.classList.toggle("active", f >= 0.98);
    });
  }

  /* ── CEO: postava vyrůstá zespodu ───────────── */
  const ceoSection = document.getElementById("onas");
  const ceoImg = document.querySelector(".ceo-photo img");
  let lastCeoShift = -1;

  function updateCeo() {
    const r = ceoSection.getBoundingClientRect();
    const vh = window.innerHeight;
    if (r.bottom < -80 || r.top > vh + 80) return;
    // 0 = sekce vjíždí zespodu, 1 = sekce odjíždí nahoru
    const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
    // na startu je postava "utopená" 26 % pod spodní hranou a růstem
    // se zvedá do finální pozice; ease-out, ať se hezky usadí
    const shift = 26 * Math.pow(1 - p, 1.15);
    if (Math.abs(shift - lastCeoShift) < 0.05) return;
    lastCeoShift = shift;
    ceoImg.style.transform = "translateY(" + shift.toFixed(2) + "%)";
  }

  /* ── Indikátor sekcí vlevo ──────────────────── */
  const sideLinks = Array.from(document.querySelectorAll("#sideNav a"));
  const sideSections = sideLinks.map((a) =>
    document.getElementById(a.getAttribute("data-section"))
  );
  const BAR_WIDTHS = [46, 28, 18, 11]; // aktivní, soused, dál, nejdál
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
