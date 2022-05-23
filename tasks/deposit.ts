import { task } from "hardhat/config";
import * as dotenv from "dotenv";
import { loggedSafeExecTx } from "../lib/lib0";

dotenv.config();

task("dao-deposit", "Make deposit in DAO")
    .addOptionalParam("needapprove", "Set to true if token needs approval to transfer (default=false)", "false")
    .addParam("amount", "Token amount to transfer")
    .setAction(async ({needapprove, amount}, hre) => {
        const dao = await hre.ethers.getContractAt("DAO", process.env.DAO ?? "");
        const voteToken = await hre.ethers.getContractAt("IERC20", process.env.VOTE_TOKEN ?? "");

        if (needapprove === "true") {
            console.log("Approving...");
            await loggedSafeExecTx(voteToken, "approve", dao.address, amount);
            console.log("Approved");
        }

        console.log("Deposit...");
        await loggedSafeExecTx(dao, "deposit", amount);
        console.log("Finished");
    });