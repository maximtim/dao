import { task } from "hardhat/config";
import * as dotenv from "dotenv";
import { loggedSafeExecTx } from "../lib/lib0";

dotenv.config();

task("dao-finish-proposal", "Finish proposal and execute result")
    .addParam("id", "Id of proposal")
    .setAction(async ({id}, hre) => {
        const dao = await hre.ethers.getContractAt("DAO", process.env.DAO ?? "");

        console.log("Vote...");
        await loggedSafeExecTx(dao, "finishProposal", id);
        console.log("Finished");
    });