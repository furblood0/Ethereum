const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const presets = {
  localhost: {
    expectedChainId: 31337,
    chainIdHex: "0x7a69",
    chainName: "Hardhat Local",
    rpcUrl: "http://127.0.0.1:8545",
    readRpcUrl: "/rpc",
  },
  hardhat: {
    expectedChainId: 31337,
    chainIdHex: "0x7a69",
    chainName: "Hardhat Local",
    rpcUrl: "http://127.0.0.1:8545",
    readRpcUrl: "/rpc",
  },
  sepolia: {
    expectedChainId: 11155111,
    chainIdHex: "0xaa36a7",
    chainName: "Sepolia",
    rpcUrl: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
    readRpcUrl: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
  },
};

function writeConfig(address, networkName) {
  const net = presets[networkName];
  if (!net) {
    throw new Error("Bu ag icin arayuz ayari yok: " + networkName);
  }

  const config = `export const contractAddress = "${address}";
export const expectedChainId = ${net.expectedChainId};
export const readRpcUrl = "${net.readRpcUrl}";
export const chainParams = {
  chainId: "${net.chainIdHex}",
  chainName: "${net.chainName}",
  rpcUrls: ["${net.rpcUrl}"],
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
};
`;

  const target = path.join(__dirname, "..", "frontend", "src", "config.js");
  fs.writeFileSync(target, config);
}

async function main() {
  const factory = await hre.ethers.getContractFactory("MessageBoard");
  const board = await factory.deploy();
  await board.waitForDeployment();

  const address = await board.getAddress();
  writeConfig(address, hre.network.name);
  require("./copy-abi");

  console.log("MessageBoard:", address);
  console.log("Owner:", await board.owner());
}

main().catch((error) => {
  const message = String(error.message || error);
  if (message.includes("ECONNREFUSED") || message.includes("connect ECONNREFUSED")) {
    console.error("Yerel ag kapali. Once baska bir terminalde: npm run node");
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
