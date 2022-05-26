import { task } from "hardhat/config";
import * as dotenv from "dotenv";
import { loggedSafeExecTx } from "../lib/lib0";

dotenv.config();

task("dao-withdraw", "Withdraw money from DAO deposit")
    .setAction(async ({}, hre) => {
        const dao = await hre.ethers.getContractAt("DAO", process.env.DAO ?? "");

        console.log("Withdraw...");
        await loggedSafeExecTx(dao, "withdrawDeposit");
        console.log("Finished");
    });