const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MessageBoard", function () {
  const fee = ethers.parseEther("0.0001");
  let board;
  let owner;
  let alice;

  beforeEach(async function () {
    [owner, alice] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MessageBoard");
    board = await Factory.deploy();
    await board.waitForDeployment();
  });

  it("deploys with the sender as owner", async function () {
    expect(await board.owner()).to.equal(owner.address);
    expect(await board.MIN_FEE()).to.equal(fee);
    expect(await board.MAX_LENGTH()).to.equal(280n);
  });

  it("stores a paid note and keeps the ether", async function () {
    await expect(board.connect(alice).post("merhaba", { value: fee }))
      .to.emit(board, "MessagePosted")
      .withArgs(alice.address, fee, "merhaba");

    const messages = await board.getMessages();
    expect(messages).to.have.length(1);
    expect(messages[0].author).to.equal(alice.address);
    expect(messages[0].text).to.equal("merhaba");
    expect(messages[0].amount).to.equal(fee);
    expect(await ethers.provider.getBalance(await board.getAddress())).to.equal(fee);
  });

  it("keeps notes in the order they were posted", async function () {
    await board.connect(alice).post("ilk", { value: fee });
    await board.connect(owner).post("ikinci", { value: fee });

    const messages = await board.getMessages();
    expect(messages[0].text).to.equal("ilk");
    expect(messages[1].text).to.equal("ikinci");
    expect(await board.messageCount()).to.equal(2n);
  });

  it("rejects a low fee, a blank note, and a note over 280 bytes", async function () {
    await expect(
      board.connect(alice).post("merhaba", { value: fee - 1n })
    ).to.be.revertedWithCustomError(board, "FeeTooLow");

    await expect(
      board.connect(alice).post("", { value: fee })
    ).to.be.revertedWithCustomError(board, "BlankMessage");

    await expect(
      board.connect(alice).post("   ", { value: fee })
    ).to.be.revertedWithCustomError(board, "BlankMessage");

    await expect(
      board.connect(alice).post("a".repeat(281), { value: fee })
    ).to.be.revertedWithCustomError(board, "MessageTooLong");
  });

  it("accepts a note that is exactly 280 bytes", async function () {
    const text = "b".repeat(280);
    await board.connect(alice).post(text, { value: fee });
    const messages = await board.getMessages();
    expect(messages[0].text).to.equal(text);
  });

  it("lets only the owner withdraw, and leaves the notes in place", async function () {
    await board.connect(alice).post("merhaba", { value: fee });

    await expect(board.connect(alice).withdraw()).to.be.revertedWithCustomError(board, "NotOwner");
    await expect(board.withdraw()).to.changeEtherBalance(owner, fee);
    expect(await ethers.provider.getBalance(await board.getAddress())).to.equal(0n);
    expect(await board.messageCount()).to.equal(1n);

    await expect(board.withdraw()).to.be.revertedWithCustomError(board, "NothingToWithdraw");
  });
});
