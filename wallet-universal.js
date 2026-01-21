// wallet-universal.js (ESM module)
// Works with:
// - Injected wallets (Chrome/Brave w/ MetaMask, Rabby, Coinbase Wallet extension)
// - WalletConnect fallback (mobile Safari, etc.)

const DEFAULTS = {
  // IMPORTANT: set this (get from dashboard)
  REOWN_PROJECT_ID: "PASTE_YOUR_PROJECT_ID_HERE",

  // Your GitHub Pages URL (must match actual origin)
  APP_NAME: "Bytesons",
  APP_DESCRIPTION: "Bytesons holders-only arcade + tools",
  APP_URL: window.location.origin,
  APP_ICONS: [`${window.location.origin}/favicon.ico`],

  // Ethereum mainnet for Bytesons gating
  OPTIONAL_CHAINS: [1],

  // Helpful for WalletConnect verification; keep URL accurate
  // (Origin must match your domain/subdomain)
};

let wcProvider = null;         // WalletConnect EIP-1193 provider (when used)
let eip1193Provider = null;    // Either injected or WC provider

export function hasInjectedWallet() {
  return typeof window !== "undefined" && typeof window.ethereum !== "undefined";
}

export async function connectUniversal(overrides = {}) {
  const cfg = { ...DEFAULTS, ...overrides };

  // 1) If injected is present, use it
  if (hasInjectedWallet()) {
    eip1193Provider = window.ethereum;
    // Request accounts
    await eip1193Provider.request({ method: "eth_requestAccounts" });
    const accounts = await eip1193Provider.request({ method: "eth_accounts" });
    return {
      kind: "injected",
      provider: eip1193Provider,
      accounts,
    };
  }

  // 2) Otherwise use WalletConnect EthereumProvider (EIP-1193)
  if (!cfg.REOWN_PROJECT_ID || cfg.REOWN_PROJECT_ID.includes("PASTE_")) {
    throw new Error("Missing REOWN_PROJECT_ID. Create one in the dashboard and paste it into wallet-universal.js.");
  }

  // Import from esm.sh so GitHub Pages can run it with no build step
  // esm.sh is designed for browser ESM imports.  [oai_citation:3‡ESM.SH](https://esm.sh/?utm_source=chatgpt.com)
  const { EthereumProvider } = await import("https://esm.sh/@walletconnect/ethereum-provider@2.23.4");

  wcProvider = await EthereumProvider.init({
    projectId: cfg.REOWN_PROJECT_ID,
    metadata: {
      name: cfg.APP_NAME,
      description: cfg.APP_DESCRIPTION,
      url: cfg.APP_URL,      // must match your actual site origin
      icons: cfg.APP_ICONS,
    },
    showQrModal: true,         // deprecated in docs but still supported; simplest for static sites
    optionalChains: cfg.OPTIONAL_CHAINS,
  });

  eip1193Provider = wcProvider;

  // Connect session
  // Docs show you can use connect() or enable()  [oai_citation:4‡docs.reown.com](https://docs.reown.com/advanced/providers/ethereum)
  if (typeof eip1193Provider.connect === "function") {
    await eip1193Provider.connect();
  } else {
    await eip1193Provider.enable();
  }

  const accounts = await eip1193Provider.request({ method: "eth_accounts" });
  return {
    kind: "walletconnect",
    provider: eip1193Provider,
    accounts,
  };
}

export async function disconnectUniversal() {
  try {
    if (wcProvider && typeof wcProvider.disconnect === "function") {
      await wcProvider.disconnect();
    }
  } finally {
    wcProvider = null;
    eip1193Provider = null;
  }
}

export function getEip1193Provider() {
  return eip1193Provider;
}

export function onWalletEvents({ onAccountsChanged, onChainChanged, onDisconnect } = {}) {
  const p = getEip1193Provider() || window.ethereum;
  if (!p || typeof p.on !== "function") return;

  if (onAccountsChanged) p.on("accountsChanged", onAccountsChanged);
  if (onChainChanged) p.on("chainChanged", onChainChanged);
  if (onDisconnect) p.on("disconnect", onDisconnect);
}