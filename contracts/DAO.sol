//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract DAO {

    address public chairPerson;
    IERC20 public voteToken;
    uint public minimunQuorum;
    uint public debatingPeriodDuration;

    uint counter;

    struct Proposal {
        bytes callData;
        address recipient;
        string description;
        uint votesFor;
        uint votesAgainst;
        uint endTime;
        bool closed;
    }

    mapping (uint => Proposal) public proposals;
    mapping (address => uint) public deposits;

    mapping (address => uint) public unlockDepositDates;
    mapping (address => mapping (uint => bool)) public voted;

    event ProposalCreated(uint indexed id, string description, uint endTime);
    event ProposalFinished(uint indexed id, bool won);

    constructor(address chairPerson_, address voteToken_, uint minimunQuorum_, uint debatingPeriodDuration_) {
        chairPerson = chairPerson_;
        voteToken = IERC20(voteToken_);
        minimunQuorum = minimunQuorum_;
        debatingPeriodDuration = debatingPeriodDuration_;
    }

    modifier only(address account) {
        require(msg.sender == account, "Restricted access");
        _;
    }

    function addProposal(bytes memory callData, address recipient, string memory description) external only(chairPerson) {
        require(recipient.code.length > 0, "Recipient has no code");

        counter++;
        uint endTime = block.timestamp + debatingPeriodDuration;
        proposals[counter] = Proposal(
            callData,
            recipient,
            description,
            0,
            0,
            endTime,
            false
        );

        emit ProposalCreated(counter, description, endTime);
    }

    function deposit(uint amount) external {
        deposits[msg.sender] += amount;
        voteToken.transferFrom(msg.sender, address(this), amount);
    }

    function vote(uint proposalNum, bool voteFor) external {
        require(voted[msg.sender][proposalNum] == false, "Already voted");

        Proposal storage prop = proposals[proposalNum];
        uint endTime = prop.endTime;
        require(block.timestamp < endTime, "Debating period is over");

        uint depo = deposits[msg.sender];
        require(depo > 0, "No deposit to vote");

        if (voteFor) {
            prop.votesFor += depo;
        } else {
            prop.votesAgainst += depo;
        }

        if (endTime > unlockDepositDates[msg.sender]) {
            unlockDepositDates[msg.sender] = endTime;
        }

        voted[msg.sender][proposalNum] = true;
    }

    function finishProposal(uint proposalNum) external {
        Proposal storage prop = proposals[proposalNum];
        require(prop.closed == false, "Proposal already closed");
        require(block.timestamp > prop.endTime, "Debating period is not over yet");

        prop.closed = true;

        uint votesFor = prop.votesFor;
        uint votesAgainst = prop.votesAgainst;
        bool won = 
            votesFor > votesAgainst && 
            votesFor + votesAgainst > minimunQuorum;

        if (won) {
            (bool success, bytes memory returndata) = prop.recipient.call(prop.callData);
            Address.verifyCallResult(success, returndata, "Function call failed");
        }

        emit ProposalFinished(proposalNum, won);
    }

    function withdrawDeposit() external {
        uint amount = deposits[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        require(block.timestamp > unlockDepositDates[msg.sender], "Deposit is not unlocked yet");

        deposits[msg.sender] = 0;
        voteToken.transfer(msg.sender, amount);
    }

    function setMinimumQuorum(uint minimumQuorum_) external only(address(this)) {
        require(minimumQuorum_ > 0, "minimunQuorum should be positive");
        minimunQuorum = minimumQuorum_;
    }

    function setDebatingPeriod(uint debatingPeriod) external only(address(this)) {
        require(debatingPeriod > 0, "debatingPeriod should be positive");
        debatingPeriodDuration = debatingPeriod;
    }
}