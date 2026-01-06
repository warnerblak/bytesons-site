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

  const WORKER = window.WORKER_URL;

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
      setStatus("No wallet detected. Open in MetaMask / Coinbase Wallet browser.");
      return;
    }

    setStatus("Connecting wallet…");
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    address = accounts?.[0] || null;

    if (!address) {
      setStatus("No wallet address returned.");
      return;
    }

    setStatus(`Connected: ${address.slice(0, 6)}…${address.slice(-4)}`);
    checkBtn.disabled = false;
  }

  async function checkHolder() {
    if (!requireWorker()) return;
    if (!address) return setStatus("Connect wallet first.");

    setStatus("Checking holder status…");
    const res = await fetch(`${WORKER}/test-holder?address=${encodeURIComponent(address)}`);
    if (!res.ok) return setStatus("Holder check failed.");

    const data = await res.json();
    if (data.isHolder) {
      setStatus("Holder confirmed. Tool unlocked.");
      tool.style.display = "block";
    } else {
      setStatus("Not a holder. Acquire a Byteson to unlock.");
      tool.style.display = "none";
    }
  }

  async function runAudit() {
    if (!requireWorker()) return;
    if (!address) return setStatus("Connect wallet first.");

    const payload = {
      address,
      projectName: projectName.value.trim(),
      projectLink: projectLink.value.trim(),
      projectCopy: projectCopy.value.trim()
    };

    if (!payload.projectCopy) return setStatus("Paste your project copy first.");

    setStatus("Generating…");
    runBtn.disabled = true;

    const res = await fetch(`${WORKER}/signal-audit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    runBtn.disabled = false;

    if (!res.ok) {
      setStatus(text || "Tool failed.");
      return;
    }

    const data = JSON.parse(text);
    outWrap.style.display = "block";
    out.textContent = data.report;
    setStatus("Done.");
  }

  connectBtn.addEventListener("click", connect);
  checkBtn.addEventListener("click", checkHolder);
  runBtn.addEventListener("click", runAudit);
})();
