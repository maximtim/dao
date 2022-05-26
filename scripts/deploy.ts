import * as hre from "hardhat";
import "../lib";
import { deployLogged } from "../lib/lib0";
import * as dotenv from "dotenv";
import "hardhat-test-utils";
import { TimeUtils } from "hardhat-test-utils/dist/src/internal";
import { parseUnits } from "ethers/lib/utils";
const time = TimeUtils(hre.ethers);

dotenv.config();

async function main() {
  await deployLogged(hre, "DAO", process.env.CHAIRPERSON, process.env.VOTE_TOKEN, parseUnits("1000", 18), time.duration.days(3));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
