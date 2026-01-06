(() => {
  const statusEl = document.getElementById("status");
  const connectBtn = document.getElementById("connect");
  const checkBtn = document.getElementById("check");
  const tool = document.getElementById("tool");
  const runBtn = document.getElementById("run");
  const outWrap = document.getElementById("outWrap");
  const out = document.getElementById("out");

  const projectName = document.getElementById("projectName");
  const projectLink = document.getElementById("projectLink");
  const projectCopy = document.getElementById("projectCopy");

  // Normalize Worker URL (removes trailing slash if present)
  const WORKER = (window.WORKER_URL || "").replace(/\/+$/, "");

  let address = null;

  const setStatus = (t) => (statusEl.textContent = t || "");

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
      setStatus("No wallet detected. Use MetaMask / Coinbase Wallet browser or install a wallet extension.");
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

      setStatus(`Connected: ${address.slice(0, 6)}…${address.slice(-4)}`);
      checkBtn.disabled = false;
    } catch (err) {
      setStatus("Wallet connection rejected.");
    }
  }

  async function fetchWithTimeout(url, ms = 12000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
      const res = await fetch(url, { signal: controller.signal });
      return res;
    } finally {
      clearTimeout(id);
    }
  }

  async function checkHolder() {
    if (!requireWorker()) return;
    if (!address) return setStatus("Connect wallet first.");

    const endpoint = `${WORKER}/test-holder?address=${encodeURIComponent(address)}`;
    setStatus(`Checking holder status…`);

    try {
      // Try call with timeout so it never “hangs”
      const res = await fetchWithTimeout(endpoint, 12000);

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        setStatus(`Holder check failed (${res.status}). ${txt || "Open the Worker URL to verify it’s live."}`);
        return;
      }

      const data = await res.json();

      if (data.isHolder) {
        setStatus("Holder confirmed. Tool unlocked.");
        tool.style.display = "block";
      } else {
        setStatus("Not a holder. Acquire a Byteson to unlock.");
        tool.style.display = "none";
      }
    } catch (err) {
      // This is what we NEED to see instead of “stuck”
      if (String(err).includes("AbortError")) {
        setStatus("Holder check timed out. Try again (or switch network / browser).");
      } else {
        setStatus("Holder check blocked (network/CORS). Hard refresh and try again.");
      }

      // Bonus: show the exact URL so you can open it manually
      console.log("Holder endpoint:", endpoint);
      console.log("Error:", err);
    }
  }

  async function runAudit() {
    if (!requireWorker()) return;
    if (!address) return setStatus("Connect wallet first.");

    const payload = {
      address,
      projectName: projectName.value.trim(),
      projectLink: projectLink.value.trim(),
      projectCopy: projectCopy.value.trim(),
    };

    if (!payload.projectCopy) return setStatus("Paste your project copy first.");

    setStatus("Generating…");
    runBtn.disabled = true;

    try {
      const res = await fetchWithTimeout(`${WORKER}/signal-audit`, 30000);
      // The call above is wrong for POST; we need POST with body.
      // So do the correct call:
      const res2 = await fetch(`${WORKER}/signal-audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res2.text();
      runBtn.disabled = false;

      if (!res2.ok) {
        setStatus(text || `Tool failed (${res2.status}).`);
        return;
      }

      const data = JSON.parse(text);
      outWrap.style.display = "block";
      out.textContent = data.report;
      setStatus("Done.");
    } catch (err) {
      runBtn.disabled = false;
      setStatus("Tool call failed (network/CORS). Hard refresh and try again.");
      console.log("Tool error:", err);
    }
  }

  connectBtn.addEventListener("click", connect);
  checkBtn.addEventListener("click", checkHolder);
  runBtn.addEventListener("click", runAudit);

  // Start state
  checkBtn.disabled = true;
})();

