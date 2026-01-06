(() => {
  // Normalize Worker URL (remove trailing slashes)
  const WORKER = (window.WORKER_URL || "").replace(/\/+$/, "");
  const PREVIEW_KEY = "bytesons_signal_audit_preview_used";

  let address = null;

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(text) {
    const statusEl = $("status");
    const statusLinkEl = $("statusLink");
    if (statusEl) statusEl.textContent = text || "";
    if (statusLinkEl) statusLinkEl.innerHTML = "";
  }

  function setStatusLink(label, href) {
    const statusLinkEl = $("statusLink");
    if (!statusLinkEl) return;
    statusLinkEl.innerHTML = "";
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = label;
    statusLinkEl.appendChild(a);
  }

  function requireWorker() {
    if (!WORKER || WORKER.includes("YOURNAME")) {
      setStatus("Set your Worker URL in signal-audit.html (window.WORKER_URL).");
      return false;
    }
    return true;
  }

  async function connect() {
    if (!requireWorker()) return;

    if (!window.ethereum) {
      setStatus("No wallet detected. Use a desktop wallet extension or wallet browser.");
      return;
    }

    try {
      setStatus("Connecting wallet…");
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      address = accounts?.[0] || null;

      if (!address) return setStatus("No wallet address returned.");

      setStatus(`Wallet connected: ${address.slice(0, 6)}…${address.slice(-4)}`);
      const checkBtn = $("check");
      if (checkBtn) checkBtn.disabled = false;
    } catch {
      setStatus("Wallet connection cancelled.");
    }
      const disconnectBtn = $("disconnect");
      if (disconnectBtn) disconnectBtn.style.display = "inline-flex";
  }

  async function checkHolder() {
    if (!requireWorker()) return;
    if (!address) return setStatus("Connect wallet first.");

    setStatus("Verifying holder access…");

    try {
      const res = await fetch(`${WORKER}/test-holder?address=${encodeURIComponent(address)}`);
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        return setStatus(`Holder check failed (${res.status}). ${t}`.trim());
      }

      const data = await res.json();
      const tool = $("tool");

      if (data.isHolder) {
        setStatus("Access confirmed.");
        if (tool) tool.style.display = "block";
      } else {
        setStatus("Access requires at least 1 Byteson.");
        if (tool) tool.style.display = "none";
        setStatusLink("View the collection on OpenSea →", "https://opensea.io/collection/bytesons");
      }
    } catch {
      // This is expected while site is still Not Secure / HTTP
      setStatus("Holder check blocked (network/CORS). This typically resolves once HTTPS is enabled.");
    }
  }

  function applyPreviewMask() {
    const outWrap = $("outWrap");
    const out = $("out");
    if (!outWrap || !out) return;

    out.style.filter = "blur(4px)";
    out.style.pointerEvents = "none";

    const existing = document.getElementById("previewMask");
    if (existing) existing.remove();

    const mask = document.createElement("div");
    mask.id = "previewMask";
    mask.style.marginTop = "16px";
    mask.style.padding = "12px";
    mask.style.border = "1px solid rgba(242,242,242,.2)";
    mask.style.borderRadius = "12px";
    mask.style.background = "rgba(0,0,0,.4)";
    mask.style.lineHeight = "1.7";
    mask.style.color = "rgba(242,242,242,.9)";

    const title = document.createElement("div");
    title.innerHTML = "<strong>Preview limit reached.</strong>";
    mask.appendChild(title);

    const copy = document.createElement("div");
    copy.style.marginTop = "6px";
    copy.textContent = "Unlock the full Signal Audit by holding at least 1 Byteson.";
    mask.appendChild(copy);

    const linkWrap = document.createElement("div");
    linkWrap.style.marginTop = "10px";
    const a = document.createElement("a");
    a.href = "https://opensea.io/collection/bytesons";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "View collection on OpenSea →";
    linkWrap.appendChild(a);
    mask.appendChild(linkWrap);

    outWrap.appendChild(mask);
  }

  async function runAudit() {
    if (!requireWorker()) return;
    if (!address) return setStatus("Connect wallet first.");

    // If they've already used the free preview, block early.
    if (localStorage.getItem(PREVIEW_KEY)) {
      setStatus("Free preview already used. Full access requires a Byteson.");
      setStatusLink("View the collection on OpenSea →", "https://opensea.io/collection/bytesons");
      return;
    }

    const projectCopy = ($("projectCopy")?.value || "").trim();
    const projectName = ($("projectName")?.value || "").trim();
    const projectLink = ($("projectLink")?.value || "").trim();

    if (!projectCopy) return setStatus("Paste your bio / description first.");

    const payload = {
      address,
      projectName,
      projectLink,
      projectCopy,
    };

    const runBtn = $("run");
    if (runBtn) runBtn.disabled = true;
    setStatus("Reviewing signal…");

    try {
      const res = await fetch(`${WORKER}/signal-audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      if (runBtn) runBtn.disabled = false;

      if (!res.ok) {
        setStatus(`Tool error (${res.status}). Check console for details.`);
        console.log("Tool error response:", text);
        return;
      }

      const data = JSON.parse(text);

      const outWrap = $("outWrap");
      const out = $("out");

      if (outWrap) outWrap.style.display = "block";
      if (out) {
        out.style.filter = "";
        out.style.pointerEvents = "";
        out.textContent = data.report || "(No report.)";
      }

      if (data.preview) {
        localStorage.setItem(PREVIEW_KEY, "true");
        setStatus("Preview shown. Full access requires at least 1 Byteson.");
        setStatusLink("Unlock full access on OpenSea →", "https://opensea.io/collection/bytesons");
        applyPreviewMask();
      } else {
        setStatus("Audit complete.");
      }
    } catch (e) {
      if (runBtn) runBtn.disabled = false;
      setStatus("Tool call failed (network). This improves once HTTPS is enabled.");
      console.log("Network error:", e);
    }
  }
function resetUI() {
  const checkBtn = $("check");
  const disconnectBtn = $("disconnect");
  const tool = $("tool");
  const outWrap = $("outWrap");
  const out = $("out");
  const previewMask = document.getElementById("previewMask");

  if (checkBtn) checkBtn.disabled = true;
  if (disconnectBtn) disconnectBtn.style.display = "none";
  if (tool) tool.style.display = "none";

  if (outWrap) outWrap.style.display = "none";
  if (out) {
    out.textContent = "";
    out.style.filter = "";
    out.style.pointerEvents = "";
  }
  if (previewMask) previewMask.remove();
}

function disconnect() {
  // Clear app session
  address = null;
  setStatus("Disconnected.");
  resetUI();

}

  
  // Bind events after DOM loads
  window.addEventListener("DOMContentLoaded", () => {
    const connectBtn = $("connect");
    const checkBtn = $("check");
    const runBtn = $("run");
    const disconnectBtn = $("disconnect");

    if (connectBtn) connectBtn.addEventListener("click", connect);
    if (checkBtn) checkBtn.addEventListener("click", checkHolder);
    if (runBtn) runBtn.addEventListener("click", runAudit);
    if (disconnectBtn) disconnectBtn.addEventListener("click", disconnect);

    if (checkBtn) checkBtn.disabled = true;
  });
})();

