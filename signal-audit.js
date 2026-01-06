(() => {
  // Wait until DOM is ready so elements exist before we bind handlers
  window.addEventListener("DOMContentLoaded", () => {
    const statusEl = document.getElementById("status");
    const statusLinkEl = document.getElementById("statusLink");

    const connectBtn = document.getElementById("connect");
    const checkBtn = document.getElementById("check");
    const runBtn = document.getElementById("run");

    const tool = document.getElementById("tool");
    const outWrap = document.getElementById("outWrap");
    const out = document.getElementById("out");

    const projectName = document.getElementById("projectName");
    const projectLink = document.getElementById("projectLink");
    const projectCopy = document.getElementById("projectCopy");

    // Normalize Worker URL (remove trailing slashes)
    const WORKER = (window.WORKER_URL || "").replace(/\/+$/, "");
    const PREVIEW_KEY = "bytesons_signal_audit_preview_used";

    let address = null;

    function setStatus(text) {
      if (statusEl) statusEl.textContent = text || "";
      if (statusLinkEl) statusLinkEl.innerHTML = "";
    }

    function setStatusLink(label, href) {
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
        setStatus("No wallet detected. Use a browser wallet extension (desktop) or a wallet browser.");
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
        if (checkBtn) checkBtn.disabled = false;
      } catch (e) {
        setStatus("Wallet connection cancelled.");
      }
    }

    async function checkHolder() {
      if (!requireWorker()) return;
      if (!address) return setStatus("Connect wallet first.");

      setStatus("Verifying holder access…");

      try {
        const res = await fetch(`${WORKER}/test-holder?address=${encodeURIComponent(address)}`);
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          setStatus(`Holder check failed (${res.status}). ${t || ""}`.trim());
          return;
        }

        const data = await res.json();
        if (data.isHolder) {
          setStatus("Access confirmed.");
          if (tool) tool.style.display = "block";
        } else {
          setStatus("Access requires at least 1 Byteson.");
          if (tool) tool.style.display = "none";
          setStatusLink("View the collection on OpenSea →", "https://opensea.io/collection/bytesons");
        }
      } catch (e) {
        // This will happen while your site is still Not Secure / HTTP
        setStatus("Holder check blocked (network/CORS). This typically resolves once HTTPS is enabled.");
      }
    }

    function applyPreviewMask() {
      if (!out || !outWrap) return;

      out.style.filter = "blur(4px)";
      out.style.pointerEvents = "none";

      // Prevent stacking multiple masks
      const existing = document.getElementById("previewMask");
      if (existing) existing.remove();

      const mask = document.createElement("div");
      mask.id = "previewMask";
      mask.style.marginTop = "16px";
      mask.style.padding = "12px";
      mask.style.border = "1px solid rgba(242,242,242,.2)";
      mask.style.borderRadius = "12px";
      mask.style.background = "rgba(0,0,0,.4)";
      mask.style.color = "rgba(242,242,242,.9)";
      mask.style.lineHeight = "1.7";

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

      const payload = {
        address,
        projectName: projectName?.value?.trim() || "",
        projectLink: projectLink?.value?.trim() || "",
        projectCopy: projectCopy?.value?.trim() || "",
      };

      if (!payload.projectCopy) return setStatus("Paste your bio / description first.");

      setStatus("Reviewing signal…");
      if (runBtn) runBtn.disabled = true;

      try {
        const res = await fetch(`${WORKER}/signal-audit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const text = await res.text();
        if (runBtn) runBtn.disabled = false;

        if (!res.ok) {
          setStatus(`Tool error (${res.status}).`);
          // show details safely as text (not HTML)
          console.log("Tool error:", text);
          return;
        }

        const data = JSON.parse(text);

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
        setStatus("Tool call failed (network/CORS). This should improve once HTTPS is enabled.");
        console.log("Network error:", e);
      }
    }

    // Bind handlers
    if (connectBtn) connectBtn.addEventListener("click", connect);
    if (checkBtn) checkBtn.addEventListener("click", checkHolder);
    if (runBtn) runBtn.addEventListener("click", runAudit);

    // Initial state
    if (checkBtn) checkBtn.disabled = true;
  });
})();
