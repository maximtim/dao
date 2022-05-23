import * as hre from "hardhat";
import "../lib";
import { deployLogged } from "../lib/lib";
import * as dotenv from "dotenv";
import "hardhat-test-utils";
const { time } = hre.testUtils;

dotenv.config();

async function main() {
  await deployLogged(hre, "DAO", process.env.SIGNER, process.env.VOTE_TOKEN, 1000, time.duration.days(3));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
