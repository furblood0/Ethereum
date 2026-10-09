import { BrowserProvider, Contract, JsonRpcProvider, formatEther } from "ethers";
import abi from "./abi.json";
import { chainParams, contractAddress, expectedChainId, readRpcUrl } from "./config.js";

const connectButton = document.querySelector("#connect");
const postButton = document.querySelector("#post");
const withdrawButton = document.querySelector("#withdraw");
const textEl = document.querySelector("#text");
const counterEl = document.querySelector("#counter");
const hintEl = document.querySelector("#hint");
const statusEl = document.querySelector("#status");
const listEl = document.querySelector("#list");
const ownerEl = document.querySelector("#owner");
const balanceEl = document.querySelector("#balance");

let provider;
let signer;
let account = "";
let owner = "";
let minFee = 0n;
let maxBytes = 280;
let pending = false;

function rpcUrl() {
  if (readRpcUrl.startsWith("/")) {
    return new URL(readRpcUrl, window.location.origin).href;
  }
  return readRpcUrl;
}

function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.className = kind === "error" ? "error" : "";
}

function explain(error) {
  const name = error?.revert?.name;
  if (name === "FeeTooLow") return "Ücret yetersiz.";
  if (name === "BlankMessage") return "Boş not gönderilemez.";
  if (name === "MessageTooLong") return "Not 280 bayttan uzun.";
  if (name === "NotOwner") return "Ücreti yalnızca tahtanın sahibi çekebilir.";
  if (name === "NothingToWithdraw") return "Çekilecek ücret yok.";
  if (error?.code === 4001 || error?.code === "ACTION_REJECTED") {
    return "İşlemi cüzdanda iptal ettin.";
  }
  return "İşlem tamamlanamadı. Ağın açık olduğundan ve doğru ağa bağlı olduğundan emin ol.";
}

function shortAddress(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function byteLength(value) {
  return new TextEncoder().encode(value).length;
}

function syncComposer() {
  const length = byteLength(textEl.value);
  counterEl.textContent = `${length} / ${maxBytes} bayt`;
  postButton.disabled = pending || minFee === 0n || length === 0 || length > maxBytes;
}

function readContract() {
  const readProvider = new JsonRpcProvider(rpcUrl(), expectedChainId, {
    staticNetwork: true,
    batchMaxCount: 1,
  });
  return new Contract(contractAddress, abi, readProvider);
}

function writeContract() {
  return new Contract(contractAddress, abi, signer);
}

function renderMessages(messages) {
  listEl.replaceChildren();
  if (messages.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Henüz not yok. İlk notu sen yaz.";
    listEl.appendChild(empty);
    return;
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const article = document.createElement("article");
    article.className = "note";

    const text = document.createElement("p");
    text.className = "note-text";
    text.textContent = message.text;

    const meta = document.createElement("p");
    meta.className = "note-meta";
    const when = new Date(Number(message.timestamp) * 1000);
    meta.textContent = `${shortAddress(message.author)} · ${formatEther(message.amount)} ETH · ${when.toLocaleString("tr-TR")}`;

    article.append(text, meta);
    listEl.appendChild(article);
  }
}

async function loadBoard() {
  if (!contractAddress) {
    setStatus("Kontrat henüz deploy edilmedi. Yerel ağı aç, deploy et, sayfayı yenile.");
    return;
  }

  const contract = readContract();
  const readProvider = contract.runner;
  const [messages, balance, nextOwner, fee, limit] = await Promise.all([
    contract.getMessages(),
    readProvider.getBalance(contractAddress),
    contract.owner(),
    contract.MIN_FEE(),
    contract.MAX_LENGTH(),
  ]);

  owner = nextOwner;
  minFee = fee;
  maxBytes = Number(limit);

  ownerEl.textContent = shortAddress(owner);
  ownerEl.title = owner;
  balanceEl.textContent = `${formatEther(balance)} ETH`;
  hintEl.textContent = `Nota ${formatEther(minFee)} ETH eklenir ve kontratta birikir. Ağ, bunun üstüne kendi işlem ücretini (gas) alır.`;
  withdrawButton.hidden = account.toLowerCase() !== owner.toLowerCase();
  renderMessages(messages);
  syncComposer();
}

async function ensureChain() {
  const network = await provider.getNetwork();
  if (network.chainId === BigInt(expectedChainId)) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainParams.chainId }],
    });
  } catch (error) {
    if (error?.code !== 4902) throw error;
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [chainParams],
    });
  }

  provider = new BrowserProvider(window.ethereum);
}

async function connectWallet() {
  if (!window.ethereum) {
    setStatus("Bu sayfa bir cüzdan ister. MetaMask kurup sayfayı yenile.", "error");
    return;
  }
  if (!contractAddress) {
    setStatus("Önce kontratı deploy et.", "error");
    return;
  }

  provider = new BrowserProvider(window.ethereum);
  await ensureChain();
  const network = await provider.getNetwork();
  if (network.chainId !== BigInt(expectedChainId)) {
    setStatus("Cüzdan yanlış ağda. Hardhat Local (31337) ağına geç.", "error");
    return;
  }
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();
  account = await signer.getAddress();
  connectButton.textContent = shortAddress(account);
  await loadBoard();
  setStatus("Cüzdan bağlandı.");
}

async function postMessage() {
  const text = textEl.value;
  if (!text.trim()) {
    setStatus("Boş not gönderilemez.", "error");
    return;
  }
  if (byteLength(text) > maxBytes) {
    setStatus("Not çok uzun.", "error");
    return;
  }

  pending = true;
  syncComposer();
  setStatus("Cüzdandan onay bekleniyor…");

  try {
    const tx = await writeContract().post(text, { value: minFee });
    setStatus("Not zincire yazılıyor…");
    await tx.wait();
    textEl.value = "";
    await loadBoard();
    setStatus("Not zincire yazıldı.");
  } catch (error) {
    setStatus(explain(error), "error");
  } finally {
    pending = false;
    syncComposer();
  }
}

async function withdraw() {
  pending = true;
  withdrawButton.disabled = true;
  setStatus("Çekim için cüzdan onayı bekleniyor…");

  try {
    const tx = await writeContract().withdraw();
    await tx.wait();
    await loadBoard();
    setStatus("Ücret sahibin cüzdanına geçti. Notlar duruyor.");
  } catch (error) {
    setStatus(explain(error), "error");
  } finally {
    pending = false;
    withdrawButton.disabled = false;
    syncComposer();
  }
}

connectButton.addEventListener("click", () => {
  connectWallet().catch((error) => setStatus(explain(error), "error"));
});

postButton.addEventListener("click", () => {
  const run = async () => {
    if (!account) await connectWallet();
    if (!account) return;
    await postMessage();
  };
  run().catch((error) => setStatus(explain(error), "error"));
});

withdrawButton.addEventListener("click", () => {
  withdraw().catch((error) => setStatus(explain(error), "error"));
});

textEl.addEventListener("input", syncComposer);

if (window.ethereum) {
  window.ethereum.on("accountsChanged", (accounts) => {
    account = accounts[0] || "";
    connectButton.textContent = account ? shortAddress(account) : "Cüzdanı bağla";
    if (!account) {
      signer = null;
      withdrawButton.hidden = true;
      return;
    }
    connectWallet().catch((error) => setStatus(explain(error), "error"));
  });
}

loadBoard().catch(() => {
  setStatus("Zincire ulaşılamadı. Yerel ağ kapalıysa başka bir terminalde npm run node çalıştır.", "error");
});

syncComposer();
