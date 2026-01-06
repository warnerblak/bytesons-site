(() => {
  const img = document.getElementById("artifact");
  const stage = document.getElementById("stage");
  const activeName = document.getElementById("activeName");
  const swatches = Array.from(document.querySelectorAll(".swatch"));

  const hueSlider = document.getElementById("hueSlider");
  const hueVal = document.getElementById("hueVal");

  const nameMap = {
    original: "Original",
    terminal: "Terminal",
    bone: "Bone",
    dusk: "Dusk",
    pastels: "Pastels",
  };

  function setHue(deg) {
    if (!stage) return;
    stage.style.setProperty("--shift", `${deg}deg`);
    if (hueVal) hueVal.textContent = `${deg}°`;
  }

  function setPalette(key) {
    if (!img) return;

    // Clear existing palette classes
    img.classList.remove(
      "p-original",
      "p-terminal",
      "p-bone",
      "p-dusk",
      "p-pastels"
    );

    img.classList.add(`p-${key}`);

    // Update active label
    if (activeName) activeName.textContent = nameMap[key] || "Original";

    // Toggle active state on buttons
    swatches.forEach((b) => {
      const isActive = b.getAttribute("data-p") === key;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    // IMPORTANT: do NOT reset hue when switching palettes
    // (user keeps their chosen hue offset)
  }

  // Palette button clicks
  swatches.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-p");
      if (!key) return;
      setPalette(key);
    });
  });

  // Hue slider changes
  if (hueSlider) {
    hueSlider.addEventListener("input", () => {
      const deg = parseInt(hueSlider.value, 10) || 0;
      setHue(deg);
    });
  }

  // Initialize
  setPalette("original");
  const initial = hueSlider ? parseInt(hueSlider.value, 10) || 0 : 0;
  setHue(initial);
})();
