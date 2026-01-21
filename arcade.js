/* Bytesons Arcade — holders only
   Gate: ERC-721 balanceOf(wallet) > 0
*/

const CONFIG = {
  // Bytesons contract (used for gating)
  BYTESONS_CONTRACT: "0xb3b434f79f69b685c063860799bdc44dac7ef25e",
  REQUIRED_BALANCE: 1n,

  // Ethereum mainnet
  REQUIRED_CHAIN_ID: 1n,
};

const ERC721_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function name() view returns (string)",
];

const el = (id) => document.getElementById(id);

const ui = {
  btnConnect: el("btnConnect"),
  btnDisconnect: el("btnDisconnect"),
  btnEnter: el("btnEnter"),
  btnExit: el("btnExit"),
  statusPill: el("statusPill"),
  network: el("network"),
  wallet: el("wallet"),
  held: el("held"),
  message: el("message"),
  gate: el("gate"),
  gameWrap: el("gameWrap"),
  scorePill: el("scorePill"),
};

let provider = null;
let signer = null;
let walletAddress = null;
let game = null;

function setMessage(text, type = "") {
  ui.message.classList.remove("good", "bad");
  if (type) ui.message.classList.add(type);
  ui.message.textContent = text;
}

function truncateAddress(addr) {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

async function ensureWallet() {
  if (!window.ethereum) {
    setMessage("No wallet detected. Install MetaMask (or use a wallet-enabled browser).", "bad");
    throw new Error("No wallet");
  }
}

async function connectWallet() {
  await ensureWallet();

  provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  walletAddress = accounts?.[0] || null;
  signer = await provider.getSigner();

  ui.wallet.textContent = walletAddress ? truncateAddress(walletAddress) : "—";
  ui.statusPill.textContent = walletAddress ? "Connected" : "Not connected";

  ui.btnDisconnect.disabled = !walletAddress;

  // Listen for changes
  window.ethereum.on?.("accountsChanged", () => window.location.reload());
  window.ethereum.on?.("chainChanged", () => window.location.reload());
}

async function getChainId() {
  const net = await provider.getNetwork();
  return BigInt(net.chainId);
}

async function gateCheck() {
  if (!provider || !walletAddress) {
    setMessage("Connect your wallet to check access.", "");
    ui.btnEnter.disabled = true;
    return false;
  }

  const chainId = await getChainId();
  ui.network.textContent = chainId === CONFIG.REQUIRED_CHAIN_ID ? "Ethereum Mainnet" : `Wrong Network (chainId ${chainId})`;

  if (chainId !== CONFIG.REQUIRED_CHAIN_ID) {
    setMessage("Switch your wallet to Ethereum Mainnet to enter.", "bad");
    ui.btnEnter.disabled = true;
    return false;
  }

  const contract = new ethers.Contract(CONFIG.BYTESONS_CONTRACT, ERC721_ABI, provider);

  // Optional: name (nice UX, not required)
  let name = "Bytesons";
  try { name = await contract.name(); } catch {}

  let bal = 0n;
  try {
    const res = await contract.balanceOf(walletAddress);
    bal = BigInt(res.toString());
  } catch (e) {
    setMessage(`Couldn’t read ${name} balance. (Is the contract correct / RPC blocked?)`, "bad");
    ui.held.textContent = "—";
    ui.btnEnter.disabled = true;
    return false;
  }

  ui.held.textContent = bal.toString();

  if (bal >= CONFIG.REQUIRED_BALANCE) {
    setMessage(`Access granted. ${name} detected in wallet.`, "good");
    ui.btnEnter.disabled = false;
    return true;
  } else {
    setMessage(`Access denied. No ${name} NFTs found in this wallet.`, "bad");
    ui.btnEnter.disabled = true;
    return false;
  }
}

/* ---------------------------
   Game: BYTE-RUNNER (starter)
   - Simple endless runner w/ boost + obstacles
   - No external assets needed (pure shapes)
---------------------------- */

function startGame() {
  ui.gate.classList.add("hidden");
  ui.gameWrap.classList.remove("hidden");

  const width = ui.game.clientWidth || 980;
  const height = Math.min(560, Math.max(440, Math.floor(width * 0.52)));

  const config = {
    type: Phaser.AUTO,
    parent: "game",
    width,
    height,
    backgroundColor: "#0a0b10",
    physics: {
      default: "arcade",
      arcade: { gravity: { y: 1200 }, debug: false }
    },
    scene: { preload, create, update }
  };

  game = new Phaser.Game(config);
}

function stopGame() {
  if (game) {
    game.destroy(true);
    game = null;
  }
  ui.gameWrap.classList.add("hidden");
  ui.gate.classList.remove("hidden");
  ui.scorePill.textContent = "Score: 0";
}

let player, ground, obstacles, cursors, scoreText;
let speed = 320;
let boost = false;
let score = 0;
let lastSpawn = 0;

function preload() {}

function create() {
  const w = this.scale.width;
  const h = this.scale.height;

  // Ground
  ground = this.add.rectangle(w/2, h-40, w, 80, 0x10131a).setStrokeStyle(2, 0x23293a);
  this.physics.add.existing(ground, true);

  // Player
  player = this.add.rectangle(120, h-120, 44, 24, 0x7c5cff).setStrokeStyle(2, 0xffffff, 0.12);
  this.physics.add.existing(player);
  player.body.setCollideWorldBounds(true);
  player.body.setSize(44, 24, true);

  // Wheels glow (just a vibe line)
  this.add.rectangle(120, h-108, 54, 2, 0x3ddc97).setAlpha(0.6);

  // Obstacles group
  obstacles = this.physics.add.group();

  // Collisions
  this.physics.add.collider(player, ground);
  this.physics.add.collider(obstacles, ground);
  this.physics.add.overlap(player, obstacles, () => {
    // Game over
    this.physics.pause();
    setMessage(`Wrecked. Final score: ${score}`, "bad");
  });

  // Input
  cursors = this.input.keyboard.createCursorKeys();
  this.input.keyboard.addKeys("W,A,S,D,SPACE");

  // Score
  score = 0;
  scoreText = this.add.text(16, 16, "SCORE 0", { fontFamily: "monospace", fontSize: "16px" });
  scoreText.setAlpha(0.85);

  setMessage("Run it. Jump over obstacles. Space = boost.", "good");
}

function spawnObstacle(scene) {
  const w = scene.scale.width;
  const h = scene.scale.height;

  const height = Phaser.Math.Between(18, 54);
  const width = Phaser.Math.Between(18, 42);

  const o = scene.add.rectangle(w + 40, h - 80 - height/2, width, height, 0xff5c7a)
    .setStrokeStyle(2, 0xffffff, 0.12);
  scene.physics.add.existing(o);

  o.body.setVelocityX(-(speed + (boost ? 140 : 0)));
  o.body.setImmovable(true);
  o.body.setAllowGravity(false);

  obstacles.add(o);
}

function update(time, delta) {
  if (!player || !player.body || !this.physics.world.isPaused) {
    // ok
  }
  if (this.physics.world.isPaused) return;

  // Boost
  const space = this.input.keyboard.keys[4]; // SPACE from addKeys
  boost = !!(space && space.isDown);

  // Jump
  const up = cursors.up.isDown || this.input.keyboard.keys[0].isDown; // W
  if (up && player.body.blocked.down) {
    player.body.setVelocityY(-520);
  }

  // Player slight lean forward on boost
  player.rotation = boost ? 0.08 : 0;

  // Score increases with speed
  const inc = (delta / 1000) * (boost ? 22 : 12);
  score += Math.floor(inc);
  ui.scorePill.textContent = `Score: ${score}`;
  scoreText.setText(`SCORE ${score}`);

  // Spawn obstacles
  const spawnEvery = boost ? 720 : 920;
  if (time - lastSpawn > spawnEvery) {
    spawnObstacle(this);
    lastSpawn = time;
  }

  // Clean obstacles
  obstacles.getChildren().forEach((o) => {
    if (o.x < -80) o.destroy();
    else {
      // Adjust obstacle velocity when boost toggles
      o.body.setVelocityX(-(speed + (boost ? 140 : 0)));
    }
  });
}

/* ---------------------------
   Wire UI
---------------------------- */

ui.btnConnect.addEventListener("click", async () => {
  try {
    setMessage("Connecting…", "");
    await connectWallet();
    await gateCheck();
  } catch (e) {
    setMessage(e?.message || "Failed to connect.", "bad");
  }
});

ui.btnDisconnect.addEventListener("click", () => {
  // Wallets don’t truly “disconnect” from dapps; best UX is just reload.
  window.location.reload();
});

ui.btnEnter.addEventListener("click", async () => {
  const ok = await gateCheck();
  if (ok) startGame();
});

ui.btnExit.addEventListener("click", () => {
  stopGame();
});

/* Auto-check if already connected */
(async function boot() {
  try {
    if (!window.ethereum) return;

    provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_accounts", []);
    if (accounts && accounts[0]) {
      walletAddress = accounts[0];
      signer = await provider.getSigner();
      ui.wallet.textContent = truncateAddress(walletAddress);
      ui.statusPill.textContent = "Connected";
      ui.btnDisconnect.disabled = false;
      await gateCheck();
    }
  } catch {
    // silent
  }
})();