const fs = require("fs");
const path = require("path");

const artifactPath = path.join(
  __dirname,
  "..",
  "artifacts",
  "contracts",
  "MessageBoard.sol",
  "MessageBoard.json"
);
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const target = path.join(__dirname, "..", "frontend", "src", "abi.json");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(artifact.abi, null, 2));
console.log("ABI yazildi:", target);
