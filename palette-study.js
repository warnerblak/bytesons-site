(() => {
  const img = document.getElementById("artifact");
  const activeName = document.getElementById("activeName");
  const swatches = Array.from(document.querySelectorAll(".swatch"));

  const nameMap = {
    original: "Original",
    mono: "Monochrome",
    gray: "Grayscale",
    terminal: "Terminal",
    bone: "Bone",
    dusk: "Dusk",
  };

  function setPalette(key) {
    if (!img) return;

    // Clear existing palette classes
    img.classList.remove(
      "p-original",
      "p-mono",
      "p-gray",
      "p-terminal",
      "p-bone",
      "p-dusk"
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
  }

  swatches.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-p");
      if (!key) return;
      setPalette(key);
    });
  });

  // Initialize
  setPalette("original");
})();
