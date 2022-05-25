import { expect } from "chai";
import { Contract } from "ethers";
import * as hre from "hardhat";
import { ethers } from "hardhat";
import { deploy, encodeFunctionCall, execTx } from "../lib/lib0";
import "hardhat-test-utils";
import { DAO, ERC20PresetMinterPauser, Test } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { TimeUtils } from "hardhat-test-utils/dist/src/internal";

describe("DAO", function () {
  const time = TimeUtils(ethers);
  

  let owner : SignerWithAddress,
     first: SignerWithAddress, 
     second: SignerWithAddress, 
     third : SignerWithAddress;
  let ownerAddr : string,
     firstAddr: string, 
     secondAddr: string, 
     thirdAddr : string;
  let dao : DAO;
  let token : ERC20PresetMinterPauser;
  const minimumQuorum = 1000_000;
  const initialBalance = 1000_000;
  const debatingPeriod = time.duration.days(3);

  beforeEach(async () => {
    [ owner, first, second, third ] = await ethers.getSigners();
    ownerAddr = await owner.getAddress();
    firstAddr = await first.getAddress();
    secondAddr = await second.getAddress();
    thirdAddr = await third.getAddress();

    const token0 = await deploy(hre, "ERC20PresetMinterPauser", "Test", "TEST");
    token = token0 as unknown as ERC20PresetMinterPauser;

    const dao0 = await deploy(hre, "DAO", ownerAddr, token.address, minimumQuorum, debatingPeriod);
    dao = dao0 as unknown as DAO;

    await execTx(token.mint(ownerAddr, initialBalance));
    await execTx(token.mint(firstAddr, initialBalance));
    await execTx(token.mint(secondAddr, initialBalance));
    await execTx(token.mint(thirdAddr, initialBalance));
  });

  it("should deploy successfully",async () => {
    expect(dao.address).to.be.properAddress;
    expect(token.address).to.be.properAddress;

    expect(await dao.voteToken()).to.eq(token.address);
    expect(await token.balanceOf(ownerAddr)).to.eq(initialBalance);
  });

  it("makes deposit",async () => {
    expect(await dao.deposits(ownerAddr)).to.eq(0);

    await execTx(token.approve(dao.address, 500_000));
    await execTx(dao.deposit(500_000));

    expect(await dao.deposits(ownerAddr)).to.eq(500_000);
  });

  it.only("creates proposal",async () => {
    // const callData = encodeFunctionCall("setMinimumQuorum(uint256)", [500_000]);
    // const iface = dao.interface;
    // const callData = iface.encodeFunctionData("setMinimumQuorum", [500_000]);
    // await execTx(token.approve(dao.address, 500_000));
    // await execTx(dao.deposit(500_000));

    // const callData = token.interface.encodeFunctionData("approve", [ownerAddr, 10]);
    const testc = await deploy(hre, "Test") as unknown as Test;
    const callData = testc.interface.encodeFunctionData("f", [11]);
    console.log(callData);
    
    // await execTx(dao.addProposal(callData, testc.address, "setMinimumQuorum 500_000", {gasLimit : 30000000, gasPrice : 8000000000}));
    await execTx(dao.addProposal(callData, testc.address, "setMinimumQuorum 500_000")); // {gasLimit : 5000_000, gasPrice : 8000000000}));
  })

  // it("withdraws deposit when not voting",async () => {
  //   expect(await dao.deposits(ownerAddr)).to.eq(0);

  //   await execTx(token.approve(dao.address, 500_000));
  //   await execTx(dao.deposit(500_000));

  //   expect(await dao.deposits(ownerAddr)).to.eq(500_000);
  // });
});
