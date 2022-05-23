import { task } from "hardhat/config";
import * as dotenv from "dotenv";
import { loggedSafeExecTx } from "../lib/lib0";

dotenv.config();

task("dao-vote", "Vote in DAO")
    .addParam("id", "Id of proposal")
    .addParam("votefor", "True if voting for, otherwise false")
    .setAction(async ({id, votefor}, hre) => {
        const dao = await hre.ethers.getContractAt("DAO", process.env.DAO ?? "");

        console.log("Vote...");
        await loggedSafeExecTx(dao, "vote", id, votefor === "true");
        console.log("Finished");
    });