(() => {
  const CONTRACT = "0xb3b434f79f69b685c063860799bdc44dac7ef25e";
  const DATA_URL = "data/artifacts.json";
  const MAX_RESULTS = 6;

  const el = (id) => document.getElementById(id);

  const vibeEl = el("vibe");
  const paletteEl = el("palette");
  const motifEl = el("motif");
  const moodEl = el("mood");

  const runBtn = el("run");
  const shuffleBtn = el("shuffle");
  const copyBtn = el("copyLink");

  const statusEl = el("status");
  const resultsEl = el("results");

  let artifacts = [];
  let lastResults = [];

  function osLink(tokenId) {
    return `https://opensea.io/assets/ethereum/${CONTRACT}/${tokenId}`;
  }

  function readStateFromUrl() {
    const url = new URL(window.location.href);
    const state = {
      vibe: url.searchParams.get("v") || "",
      palette: url.searchParams.get("p") || "",
      motif: url.searchParams.get("m") || "",
      mood: url.searchParams.get("d") || "",
    };
    return state;
  }

  function writeStateToUrl(state) {
    const url = new URL(window.location.href);
    if (state.vibe) url.searchParams.set("v", state.vibe); else url.searchParams.delete("v");
    if (state.palette) url.searchParams.set("p", state.palette); else url.searchParams.delete("p");
    if (state.motif) url.searchParams.set("m", state.motif); else url.searchParams.delete("m");
    if (state.mood) url.searchParams.set("d", state.mood); else url.searchParams.delete("d");
    window.history.replaceState({}, "", url.toString());
  }

  function currentState() {
    return {
      vibe: vibeEl.value,
      palette: paletteEl.value,
      motif: motifEl.value,
      mood: moodEl.value,
    };
  }

  function applyStateToControls(state) {
    vibeEl.value = state.vibe;
    paletteEl.value = state.palette;
    motifEl.value = state.motif;
    moodEl.value = state.mood;
  }

  function match(artifact, state) {
    const tags = (artifact.tags || []).map((t) => String(t).toLowerCase());
    if (state.vibe && !tags.includes(state.vibe)) return false;
    if (state.palette && !tags.includes(state.palette)) return false;
    if (state.motif && !tags.includes(state.motif)) return false;
    if (state.mood && !tags.includes(state.mood)) return false;
    return true;
  }

  function score(artifact, state) {
    // Very light scoring: prefer items that match more selected tags.
    const tags = (artifact.tags || []).map((t) => String(t).toLowerCase());
    let s = 0;
    if (state.vibe && tags.includes(state.vibe)) s++;
    if (state.palette && tags.includes(state.palette)) s++;
    if (state.motif && tags.includes(state.motif)) s++;
    if (state.mood && tags.includes(state.mood)) s++;
    return s;
  }

  function chooseResults(state, { shuffle = false } = {}) {
    const pool = artifacts
      .filter((a) => match(a, state))
      .map((a) => ({ a, s: score(a, state) }))
      .sort((x, y) => y.s - x.s);

    if (!pool.length) return [];

    let chosen = pool.map((x) => x.a);

    if (shuffle) {
      // Fisher-Yates
      for (let i = chosen.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
      }
    }

    return chosen.slice(0, MAX_RESULTS);
  }

  function pills(tags = []) {
    return tags
      .slice(0, 6)
      .map((t) => `<span class="pill">${escapeHtml(String(t))}</span>`)
      .join("");
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[m]));
  }

  function render(results) {
    resultsEl.innerHTML = "";
    if (!results.length) {
      resultsEl.innerHTML = `
        <div class="result">
          <div class="small" style="opacity:.85; line-height:1.85;">
            No matches in the current index.
          </div>
          <div class="small" style="opacity:.7; line-height:1.85; margin-top:8px;">
            Try loosening filters, or add more tagged artifacts to <span class="mono">data/artifacts.json</span>.
          </div>
        </div>
      `;
      return;
    }

    results.forEach((a) => {
      const url = osLink(a.id);
      const reason = a.reason ? escapeHtml(a.reason) : "A clean match for the selected constraints.";
      resultsEl.insertAdjacentHTML("beforeend", `
        <div class="result">
          <div class="mono" style="font-size:16px; margin-bottom:8px;">
            Bytesons #${escapeHtml(String(a.id))}
          </div>

          <div class="small" style="opacity:.82; line-height:1.85;">
            ${reason}
          </div>

          <div style="margin-top:10px;">
            ${pills(a.tags || [])}
          </div>

          <div style="margin-top:14px;">
            <a class="btn btn-ghost" href="${url}" target="_blank" rel="noopener noreferrer">View on OpenSea</a>
          </div>
        </div>
      `);
    });
  }

  async function copyShareLink() {
    const state = currentState();
    writeStateToUrl(state);
    const url = window.location.href;

    try {
      await navigator.clipboard.writeText(url);
      statusEl.textContent = "Copied.";
      setTimeout(() => (statusEl.textContent = ""), 1600);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  function run({ shuffle = false } = {}) {
    const state = currentState();
    writeStateToUrl(state);

    const results = chooseResults(state, { shuffle });
    lastResults = results;

    statusEl.textContent = results.length ? `${results.length} shown.` : "No matches.";
    render(results);
  }

  async function init() {
    statusEl.textContent = "Loading…";

    try {
      const res = await fetch(DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load ${DATA_URL}`);
      const data = await res.json();
      artifacts = Array.isArray(data) ? data : (data.artifacts || []);
    } catch (e) {
      resultsEl.innerHTML = `
        <div class="result">
          <div class="small" style="opacity:.85; line-height:1.85;">
            Could not load the artifact index.
          </div>
          <div class="small" style="opacity:.7; line-height:1.85; margin-top:8px;">
            Ensure <span class="mono">data/artifacts.json</span> exists and is valid JSON.
          </div>
        </div>
      `;
      statusEl.textContent = "Index missing.";
      return;
    }

    const state = readStateFromUrl();
    applyStateToControls(state);

    statusEl.textContent = `${artifacts.length} indexed.`;
    run({ shuffle: false });
  }

  runBtn.addEventListener("click", () => run({ shuffle: false }));
  shuffleBtn.addEventListener("click", () => run({ shuffle: true }));
  copyBtn.addEventListener("click", copyShareLink);

  init();
})();
