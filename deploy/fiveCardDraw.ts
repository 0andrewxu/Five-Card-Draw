import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, log } = hre.deployments;

  const deployed = await deploy("FiveCardDraw", {
    from: deployer,
    log: true,
  });

  log(`FiveCardDraw contract: ${deployed.address}`);
};

export default func;
func.id = "deploy_five_card_draw";
func.tags = ["FiveCardDraw"];

