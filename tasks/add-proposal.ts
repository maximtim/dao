import { task } from "hardhat/config";
import * as dotenv from "dotenv";
import { encodeFunctionCall, loggedSafeExecTx } from "../lib/lib0";

dotenv.config();

task("dao-add-proposal", "Add new proposal in DAO")
    .addParam("signature", "Abi signature of called function, e.g. \"transfer(address,uint256)\"")
    .addParam("recipient", "Address of called contract")
    .addParam("desc", "Proposal description")
    .addOptionalVariadicPositionalParam("args", "Arguments for function call", [])
    .setAction(async ({signature, recipient, desc, args}, hre) => {
        const dao = await hre.ethers.getContractAt("DAO", process.env.DAO ?? "");

        const callData = encodeFunctionCall(signature, args);

        console.log("Add proposal...");
        await loggedSafeExecTx(dao, "addProposal", callData, recipient, desc);
        console.log("Finished");
    });