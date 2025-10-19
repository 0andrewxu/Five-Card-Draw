import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("game:address", "Prints the FiveCardDraw address").setAction(async function (_args: TaskArguments, hre) {
  const d = await hre.deployments.get("FiveCardDraw");
  console.log("FiveCardDraw:", d.address);
});

task("game:create", "Create a new game")
  .addOptionalParam("value", "stake in wei (default 1e15)")
  .setAction(async function (args: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const d = await deployments.get("FiveCardDraw");
    const c = await ethers.getContractAt("FiveCardDraw", d.address);
    const [signer] = await ethers.getSigners();
    const value = args.value ? BigInt(args.value) : 1_000_000_000_000_000n; // fallback
    const tx = await c.connect(signer).createGame({ value });
    const rc = await tx.wait();
    console.log("tx:", tx.hash, "status:", rc?.status);
  });

task("game:join", "Join a game")
  .addParam("id", "game id")
  .setAction(async function (args: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const d = await deployments.get("FiveCardDraw");
    const c = await ethers.getContractAt("FiveCardDraw", d.address);
    const [, signer] = await ethers.getSigners();
    const tx = await c.connect(signer).joinGame(args.id, { value: 1_000_000_000_000_000n });
    const rc = await tx.wait();
    console.log("tx:", tx.hash, "status:", rc?.status);
  });
