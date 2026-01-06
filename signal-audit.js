(() => {
  const statusEl = document.getElementById("status");
  const statusLinkEl = document.getElementById("statusLink");

  const connectBtn = document.getElementById("connect");
  const checkBtn = document.getElementById("check");

  const tool = document.getElementById("tool");
  const runBtn = document.getElementById("run");

  const outWrap = document.getElementById("outWrap");
  const out = document.getElementById("out");

  const projectName = document.getElementById("projectName");
  const projectLink = document.getElementById("projectLink");
  const projectCopy = document.getElementById("projectCopy");

  // Normalize Worker URL (remove trailing slash if present)
  const API = (window.WORKER_URL || "").replace(/\/+$/, "");

  let address = null;

  const setStatus = (text) => {
    statusEl.textContent = text || "";
    if (statusLinkEl) statusLinkEl.innerHTML = "";
  };

  const setLink = (href, label) => {
    if (!statusLinkEl) return;
    statusLinkEl.innerHTML = "";
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = label;
    statusLinkEl.appendChild(a);
  };

  const requireApi = () => {
    if (!API || API.includes("YOURNAME")) {
      setStatus("Set your Worker URL in signal-audit.html (window.WORKER_URL).");
      return false;
    }
    return true;
  };

  async function fetchWithTimeout(url, options = {}, ms = 12000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(id);
    }
  }

  async function connectWallet() {
    if (!requireApi()) return;

    if (!window.ethereum) {
      setStatus("No wallet detected. Use a wallet extension (desktop) or a wallet browser.");
      return;
    }

    try {
      setStatus("Connecting wallet…");
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      address = accounts?.[0] || null;

      if (!address) {
        setStatus("No wallet address returned.");
        return;
      }

      setStatus(`Wallet connected: ${address.slice(0, 6)}…${address.slice(-4)}`);
      checkBtn.disabled = false;
    } catch {
      setStatus("Wallet connection cancelled.");
    }
  }

  async function verifyHolderAccess() {
    if (!requireApi()) return;
    if (!address) return setStatus("Connect wallet first.");

    setStatus("Verifying holder access…");

    try {
      const url = `${API}/test-holder?address=${encodeURIComponent(address)}`;
      const res = await fetchWithTimeout(url, {}, 12000);

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        setStatus(`Holder check failed (${res.status}). ${txt || "Try again."}`);
        tool.style.display = "none";
        return;
      }

      const data = await res.json();

      if (data.isHolder) {
        setStatus("Access confirmed.");
        tool.style.display = "block";
        return;
      }

      setStatus("Access requires at least 1 Byteson.");
      setLink("https://opensea.io/collection/bytesons", "View the collection on OpenSea");
      tool.style.display = "none";
    } catch (err) {
      if (String(err).includes("AbortError")) {
        setStatus("Holder check timed out. Try again.");
      } else {
        setStatus("Holder check blocked (network/CORS). If you’re on mobile, try a desktop wallet extension.");
      }
      tool.style.display = "none";
    }
  }

  async function runAudit() {
  if (!requireWorker()) return;
  if (!address) return setStatus("Connect wallet first.");

  const PREVIEW_KEY = "bytesons_signal_audit_preview_used";

  // If they already used preview and they are not a holder, stop early.
  // We don't know holder status here, so we’ll enforce after response too.
  if (localStorage.getItem(PREVIEW_KEY)) {
    setStatus("Free preview already used. Full access requires a Byteson.");
    if (statusLinkEl) {
      const a = document.createElement("a");
      a.href = "https://opensea.io/collection/bytesons";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "View the collection on OpenSea →";
      statusLinkEl.appendChild(a);
    }
    return;
  }

  const payload = {
    address,
    projectName: projectName.value.trim(),
    projectLink: projectLink.value.trim(),
    projectCopy: projectCopy.value.trim(),
  };

  if (!payload.projectCopy) return setStatus("Paste your project copy first.");

  setStatus("Reviewing signal…");
  runBtn.disabled = true;

  try {
    const res = await fetch(`${WORKER}/signal-audit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    runBtn.disabled = false;

    if (!res.ok) {
      setStatus(text || `Tool failed (${res.status}).`);
      return;
    }

    const data = JSON.parse(text);

    outWrap.style.display = "block";
    out.style.filter = "";
    out.style.pointerEvents = "";
    out.textContent = data.report || "(No report.)";

    // Preview logic
    if (data.preview) {
      localStorage.setItem(PREVIEW_KEY, "true");

      // Blur the output + show CTA
      out.style.filter = "blur(4px)";
      out.style.pointerEvents = "none";

      setStatus("Preview shown. Full access requires at least 1 Byteson.");

      if (statusLinkEl) {
        const a = document.createElement("a");
        a.href = "https://opensea.io/collection/bytesons";
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = "Unlock full access on OpenSea →";
        statusLinkEl.appendChild(a);
      }
    } else {
      setStatus("Audit complete.");
    }
  } catch (err) {
    runBtn.disabled = false;
    setStatus("Tool call failed (network). Try again after HTTPS is enabled.");
    console.log(err);
  }
}

  // Wire buttons
  checkBtn.disabled = true;
  tool.style.display = "none";
  outWrap.style.display = "none";

  connectBtn.addEventListener("click", connectWallet);
  checkBtn.addEventListener("click", verifyHolderAccess);
  runBtn.addEventListener("click", runAudit);
})();
