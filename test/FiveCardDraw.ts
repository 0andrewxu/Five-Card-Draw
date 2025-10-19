import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { FiveCardDraw, FiveCardDraw__factory } from "../types";

type Signers = {
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

function messageDigest(gameId: bigint, choice: number) {
  return ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint8"], [gameId, choice]));
}

describe("FiveCardDraw (mock)", function () {
  let signers: Signers;
  let game: FiveCardDraw;

  before(async function () {
    const [alice, bob] = await ethers.getSigners();
    signers = { alice, bob };
  });

  beforeEach(async function () {
    const factory = (await ethers.getContractFactory("FiveCardDraw")) as FiveCardDraw__factory;
    game = await factory.deploy();
  });

  it("happy path: create, join, submit, claim", async function () {
    // Alice creates a game
    const txCreate = await game.connect(signers.alice).createGame({ value: 1_000_000_000_000_000n });
    const rcCreate = await txCreate.wait();
    const ev = rcCreate!.logs.map((l: any) => game.interface.parseLog(l)).find((x: any) => x?.name === "GameCreated");
    const gameId = ev?.args?.gameId as bigint;
    const board: number[] = (ev?.args?.publicCards as number[]).map((x) => Number(x));
    const p1Choice = Math.min(...board);
    const p2Choice = Math.max(...board);
    expect(gameId).to.be.a("bigint");

    // Bob joins
    await expect(game.connect(signers.bob).joinGame(gameId, { value: 1_000_000_000_000_000n })).to.emit(
      game,
      "GameJoined",
    );

    // Alice submits encrypted selection 5 with signature
    const digest1 = messageDigest(gameId, p1Choice);
    const sig1 = await signers.alice.signMessage(ethers.getBytes(digest1));
    const enc1 = await fhevm
      .createEncryptedInput(await game.getAddress(), signers.alice.address)
      .add8(p1Choice)
      .encrypt();
    await expect(
      game.connect(signers.alice).submitSelection(gameId, enc1.handles[0], enc1.inputProof, sig1),
    ).to.emit(
      game,
      "SelectionSubmitted",
    );

    // Bob submits encrypted selection 9 with signature
    const digest2 = messageDigest(gameId, p2Choice);
    const sig2 = await signers.bob.signMessage(ethers.getBytes(digest2));
    const enc2 = await fhevm
      .createEncryptedInput(await game.getAddress(), signers.bob.address)
      .add8(p2Choice)
      .encrypt();
    await expect(
      game.connect(signers.bob).submitSelection(gameId, enc2.handles[0], enc2.inputProof, sig2),
    ).to.emit(
      game,
      "Opened",
    );

    // Bob claims with both clear choices
    const balBefore = await ethers.provider.getBalance(signers.bob.address);
    const txClaim = await game.connect(signers.bob).claim(gameId, p1Choice, p2Choice);
    const rcClaim = await txClaim.wait();
    const gas = rcClaim!.gasUsed * txClaim.gasPrice!;
    const balAfter = await ethers.provider.getBalance(signers.bob.address);
    // +0.002 ETH - gas
    expect(balAfter - balBefore + gas).to.equal(2_000_000_000_000_000n);
  });
});
