import { expect } from "chai";
import { constants, Contract } from "ethers";
import * as hre from "hardhat";
import { ethers } from "hardhat";
import { deploy, encodeFunctionCall, execTx, expectTuple } from "../lib/lib0";
import "hardhat-test-utils";
import { DAO, ERC20PresetMinterPauser, Test } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { TimeUtils } from "hardhat-test-utils/dist/src/internal";

describe("DAO", function () {
  const time = TimeUtils(ethers);
  this.timeout(0);

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

  it("creates proposal",async () => {
    const iface = dao.interface;
    const callData = iface.encodeFunctionData("setMinimumQuorum", [500_000]);

    await expectTuple(dao.proposals(1), "0x", constants.AddressZero, "", 0, 0, 0, false);
    
    await expect(dao.addProposal(callData, dao.address, "setMinimumQuorum 500_000"))
      .to.emit(dao, "ProposalCreated");

    await expectTuple(dao.proposals(1), callData, dao.address, "setMinimumQuorum 500_000", 0, 0);
  });

  it("fails to create proposal when not chairperson",async () => {
    const iface = dao.interface;
    const callData = iface.encodeFunctionData("setMinimumQuorum", [500_000]);

    await expectTuple(dao.proposals(1), "0x", constants.AddressZero, "", 0, 0, 0, false);
    
    await expect(dao.connect(first).addProposal(callData, dao.address, "setMinimumQuorum 500_000"))
      .to.be.revertedWith("Restricted access");
  });

  it("fails to create proposal when recipient is not a contract",async () => {
    const iface = dao.interface;
    const callData = iface.encodeFunctionData("setMinimumQuorum", [500_000]);

    await expectTuple(dao.proposals(1), "0x", constants.AddressZero, "", 0, 0, 0, false);
    
    await expect(dao.addProposal(callData, firstAddr, "setMinimumQuorum 500_000"))
      .to.be.revertedWith("Recipient has no code");
  });

  it("fails to withdraw when no deposit",async () => {
    expect(await dao.deposits(ownerAddr)).to.eq(0);

    await expect(dao.withdrawDeposit()).to.be.revertedWith("Nothing to withdraw");
  });
  

  context("Proposal created", function () {
    beforeEach(async () => {
      await execTx(token.approve(dao.address, 500_000));
      await execTx(dao.deposit(500_000));

      await execTx(token.connect(first).approve(dao.address, 600_000));
      await execTx(dao.connect(first).deposit(600_000));

      await execTx(token.connect(second).approve(dao.address, 400_000));
      await execTx(dao.connect(second).deposit(400_000));

      const callData = dao.interface.encodeFunctionData("setMinimumQuorum", [500_000]);
      await execTx(dao.addProposal(callData, dao.address, "setMinimumQuorum 500_000"));
    });

    it("withdraws deposit when not voting",async () => {
      expect(await dao.deposits(ownerAddr)).to.eq(500_000);

      await execTx(dao.withdrawDeposit());

      expect(await dao.deposits(ownerAddr)).to.eq(0);
    });

    it("votes successfully", async () => {
      expect(await dao.voted(ownerAddr, 1)).to.be.false;

      await execTx(dao.vote(1, true));

      expect(await dao.voted(ownerAddr, 1)).to.be.true;
    });

    it("fails to vote twice", async () => {
      expect(await dao.voted(ownerAddr, 1)).to.be.false;

      await execTx(dao.vote(1, true));
      await expect(dao.vote(1, true)).to.be.revertedWith("Already voted");
    });

    it("fails to vote when no deposit", async () => {
      expect(await dao.voted(thirdAddr, 1)).to.be.false;

      await expect(dao.connect(third).vote(1, true)).to.be.revertedWith("No deposit to vote");
    });

    it("fails to vote when debating period is over", async () => {
      expect(await dao.voted(ownerAddr, 1)).to.be.false;

      await time.increase(debatingPeriod);
      await expect(dao.vote(1, true)).to.be.revertedWith("Debating period is over");
    });

    it("finishes proposal and executes function",async () => {
      await execTx(dao.vote(1, true));
      await execTx(dao.connect(first).vote(1, true));
      await execTx(dao.connect(second).vote(1, false));

      await time.increase(debatingPeriod);
      expect((await dao.proposals(1)).closed).to.be.false;
      expect(await dao.minimunQuorum()).to.eq(minimumQuorum);

      await expect(dao.finishProposal(1)).to.emit(dao, "ProposalFinished").withArgs(1, true);

      expect((await dao.proposals(1)).closed).to.be.true;
      expect(await dao.minimunQuorum()).to.eq(500_000);
    });

    it("doesn't call function if proposal failed",async () => {
      await execTx(dao.vote(1, true));
      await execTx(dao.connect(first).vote(1, false));
      await execTx(dao.connect(second).vote(1, false));

      await time.increase(debatingPeriod);
      expect((await dao.proposals(1)).closed).to.be.false;
      expect(await dao.minimunQuorum()).to.eq(minimumQuorum);

      await expect(dao.finishProposal(1)).to.emit(dao, "ProposalFinished").withArgs(1, false);

      expect((await dao.proposals(1)).closed).to.be.true;
      expect(await dao.minimunQuorum()).to.eq(minimumQuorum);
    });

    it("doesn't call function if minimum quorum wasn't reached",async () => {
      await execTx(dao.vote(1, true));

      await time.increase(debatingPeriod);
      expect((await dao.proposals(1)).closed).to.be.false;
      expect(await dao.minimunQuorum()).to.eq(minimumQuorum);

      await expect(dao.finishProposal(1)).to.emit(dao, "ProposalFinished").withArgs(1, false);

      expect((await dao.proposals(1)).closed).to.be.true;
      expect(await dao.minimunQuorum()).to.eq(minimumQuorum);
    });

    it("fails to finish proposal when debating period is not over",async () => {
      await expect(dao.finishProposal(1)).to.be.revertedWith("Debating period is not over yet");
    });

    it("fails to close proposal twice",async () => {
      await time.increase(debatingPeriod);
      await execTx(dao.finishProposal(1));
      await expect(dao.finishProposal(1)).to.be.revertedWith("Proposal already closed");
    });

    it("fails to withdraw when proposal is not finished",async () => {
      expect(await dao.deposits(ownerAddr)).to.eq(500_000);

      await execTx(dao.vote(1, true));
      await expect(dao.withdrawDeposit()).to.be.revertedWith("Deposit is not unlocked yet");
    });

    it("reverts function call when inner require failed",async () => {
      const callData = dao.interface.encodeFunctionData("setMinimumQuorum", [0]);
      await execTx(dao.addProposal(callData, dao.address, "setMinimumQuorum 0"));

      await execTx(dao.vote(2, true));
      await execTx(dao.connect(first).vote(2, true));
      await execTx(dao.connect(second).vote(2, false));

      await time.increase(debatingPeriod);
      expect((await dao.proposals(2)).closed).to.be.false;
      expect(await dao.minimunQuorum()).to.eq(minimumQuorum);

      await expect(dao.finishProposal(2)).to.be.revertedWith("minimunQuorum should be positive");
    });

    it("finishes proposal and executes function-2",async () => {
      const callData = dao.interface.encodeFunctionData("setDebatingPeriod", [time.duration.days(1)]);
      await execTx(dao.addProposal(callData, dao.address, "setDebatingPeriod 1 day"));

      await execTx(dao.vote(2, true));
      await execTx(dao.connect(first).vote(2, true));
      await execTx(dao.connect(second).vote(2, false));

      await time.increase(debatingPeriod);
      expect((await dao.proposals(2)).closed).to.be.false;
      expect(await dao.debatingPeriodDuration()).to.eq(debatingPeriod);

      await expect(dao.finishProposal(2)).to.emit(dao, "ProposalFinished").withArgs(2, true);

      expect((await dao.proposals(2)).closed).to.be.true;
      expect(await dao.debatingPeriodDuration()).to.eq(time.duration.days(1));
    });

    it("reverts function call when inner require failed-2",async () => {
      const callData = dao.interface.encodeFunctionData("setDebatingPeriod", [0]);
      await execTx(dao.addProposal(callData, dao.address, "setDebatingPeriod 0"));

      await execTx(dao.vote(2, true));
      await execTx(dao.connect(first).vote(2, true));
      await execTx(dao.connect(second).vote(2, false));

      await time.increase(debatingPeriod);
      expect((await dao.proposals(2)).closed).to.be.false;
      expect(await dao.debatingPeriodDuration()).to.eq(debatingPeriod);

      await expect(dao.finishProposal(2)).to.be.revertedWith("debatingPeriod should be positive");
    });
  });
});
