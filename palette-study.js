(() => {
  const img = document.getElementById("artifact");
  const stage = document.getElementById("stage");
  const activeName = document.getElementById("activeName");
  const swatches = Array.from(document.querySelectorAll(".swatch"));

  const hueSlider = document.getElementById("hueSlider");
  const hueVal = document.getElementById("hueVal");

  const copyBtn = document.getElementById("copyLink");
  const copyStatus = document.getElementById("copyStatus");

  const validPalettes = new Set(["original", "terminal", "bone", "dusk", "pastels"]);

  const nameMap = {
    original: "Original",
    terminal: "Terminal",
    bone: "Bone",
    dusk: "Dusk",
    pastels: "Pastels",
  };

  let currentPalette = "original";
  let currentHue = hueSlider ? (parseInt(hueSlider.value, 10) || 0) : 0;

  function clampHue(n) {
    // Keep consistent with your slider bounds
    if (n > 30) return 30;
    if (n < -30) return -30;
    return n;
  }

  function setHue(deg, { syncSlider = true, updateUrl = true } = {}) {
    currentHue = clampHue(parseInt(deg, 10) || 0);

    if (stage) stage.style.setProperty("--shift", `${currentHue}deg`);
    if (hueVal) hueVal.textContent = `${currentHue}°`;
    if (syncSlider && hueSlider) hueSlider.value = String(currentHue);

    if (updateUrl) writeStateToUrl();
  }

  function setPalette(key, { updateUrl = true } = {}) {
    if (!validPalettes.has(key)) key = "original";
    currentPalette = key;

    if (img) {
      img.classList.remove("p-original", "p-terminal", "p-bone", "p-dusk", "p-pastels");
      img.classList.add(`p-${currentPalette}`);
    }

    if (activeName) activeName.textContent = nameMap[currentPalette] || "Original";

    swatches.forEach((b) => {
      const isActive = b.getAttribute("data-p") === currentPalette;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    if (updateUrl) writeStateToUrl();
  }

  function writeStateToUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("p", currentPalette);
    url.searchParams.set("h", String(currentHue));

    // Don’t create history spam; keep it quiet
    window.history.replaceState({}, "", url.toString());
  }

  function readStateFromUrl() {
    const url = new URL(window.location.href);
    const p = (url.searchParams.get("p") || "original").toLowerCase();
    const hRaw = url.searchParams.get("h");
    const h = clampHue(parseInt(hRaw, 10) || 0);

    return {
      palette: validPalettes.has(p) ? p : "original",
      hue: h,
    };
  }

  async function copyShareLink() {
    if (!copyBtn) return;

    const url = new URL(window.location.href);
    url.searchParams.set("p", currentPalette);
    url.searchParams.set("h", String(currentHue));

    const shareUrl = url.toString();

    try {
      await navigator.clipboard.writeText(shareUrl);
      if (copyStatus) copyStatus.textContent = "Copied.";
      setTimeout(() => {
        if (copyStatus) copyStatus.textContent = "";
      }, 1600);
    } catch (e) {
      // Fallback: select via prompt (still works everywhere)
      window.prompt("Copy this link:", shareUrl);
    }
  }

  // Wire swatches
  swatches.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = (btn.getAttribute("data-p") || "original").toLowerCase();
      setPalette(key, { updateUrl: true });
    });
  });

  // Wire hue slider
  if (hueSlider) {
    hueSlider.addEventListener("input", () => {
      const deg = parseInt(hueSlider.value, 10) || 0;
      setHue(deg, { syncSlider: true, updateUrl: true });
    });
  }

  // Wire copy button
  if (copyBtn) {
    copyBtn.addEventListener("click", copyShareLink);
  }

  // Init from URL
  const initial = readStateFromUrl();
  setPalette(initial.palette, { updateUrl: false });
  setHue(initial.hue, { syncSlider: true, updateUrl: false });
  writeStateToUrl();
})();
