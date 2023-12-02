import { ethers } from "./ethers.js";
import { vault_address, mintable_erc_20_abi, erc_20_abi, vault_abi } from "./constants.js";

// get buttons
const connectButton = document.getElementById("connectButton");
const allowBaseTokenButton = document.getElementById("allowBaseTokenButton");
const convertButton = document.getElementById("convertButton");
const redeemButton = document.getElementById("redeemButton");
const withdrawFeesButton = document.getElementById("withdrawFeesButton");
const unlockRequestButton = document.getElementById("unlockRequestButton");
const resolveDisputeButton = document.getElementById("resolveDisputeButton");
const voteButton = document.getElementById("voteButton");
const allowBaseTokenForVotingButton = document.getElementById("allowBaseTokenForVotingButton");
const allowGovernanceTokenForVotingButton = document.getElementById("allowGovernanceTokenForVotingButton");
const withdrawBaseTokenRewardButton = document.getElementById("withdrawBaseTokenRewardButton");
const withdrawGovernanceTokenRewardButton = document.getElementById("withdrawGovernanceTokenRewardButton");

// get fields
const vaultToken = document.getElementById("vaultToken");
const oracleCondition = document.getElementById("oracleCondition");
const vaultStatus = document.getElementById("vaultStatus");
const baseTokenAmount = document.getElementById("baseTokenAmount");
const cTokenAmount = document.getElementById("cTokenAmount");
const iTokenAmount = document.getElementById("iTokenAmount");
const governanceTokenAmount = document.getElementById("governanceTokenAmount");
const accruedFeesAmount = document.getElementById("accruedFeesAmount");
const votingPhase = document.getElementById("votingPhase");
const unlockAmount = document.getElementById("unlockAmount");
const baseTokenReward = document.getElementById("baseTokenReward");
const governanceTokenReward = document.getElementById("governanceTokenReward");

// event handlers
try { connectButton.onclick = connect; } catch (error) { }
try { allowBaseTokenButton.onclick = allowBaseToken; } catch (error) { }
try { convertButton.onclick = convert; } catch (error) { }
try { redeemButton.onclick = redeem; } catch (error) { }
try { withdrawFeesButton.onclick = withdrawFees; } catch (error) { }
try { unlockRequestButton.onclick = requestUnlock; } catch (error) { }
try { resolveDisputeButton.onclick = resolveDispute; } catch (error) { }
try { voteButton.onclick = vote; } catch (error) { }
try { allowBaseTokenForVotingButton.onclick = allowBaseTokenForVoting; } catch (error) { }
try { allowGovernanceTokenForVotingButton.onclick = allowGovernanceTokenForVoting; } catch (error) { }
try { withdrawBaseTokenRewardButton.onclick = withdrawBaseTokenReward; } catch (error) { }
try { withdrawGovernanceTokenRewardButton.onclick = withdrawGovernanceTokenReward; } catch (error) { }

// oninput events
try { document.getElementById("convertInput").oninput = convertInputChange; } catch (error) { }
try { document.getElementById("voteWeight").oninput = voteWeightInputChange; } catch (error) { }

// global variables
var connected = false;
var account = "";

// token decimals
const base_token_decimals = 18;
const governance_token_decimals = 18;
const i_token_decimals = 18;
const c_token_decimals = 18;

function round(number, decimals) {
  return Math.round(number / decimals * 100) / 100
}

// connecting

await checkConnectionStatus();

async function checkConnectionStatus() {

  if (typeof window.ethereum !== "undefined") {

    const accounts = await window.ethereum.request({ method: "eth_accounts" });

    if (accounts.length > 0) {

      // set connection status
      connected = true;
      connectButton.innerHTML = "CONNECTED";

      // set active account
      account = accounts[0];

      // update fields
      await updateFields();

    } else {
      connected = false;
    }
  } else {
    connected = false;
  }
}

async function connect() {
  if (!connected) {
    if (typeof window.ethereum !== "undefined") {
      try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        await checkConnectionStatus();
      } catch (error) {
        console.log(error);
      }
    } else {
      console.log("Install MetaMask");
    }
  } else {
    console.log("Already Connected!");
  }
}

// smart contract logic

async function updateFields() {

  if (connected) {

    // connect to contracts
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const vault_contract = new ethers.Contract(vault_address, vault_abi, signer);
    const governance_token_contract = new ethers.Contract(await vault_contract.getGovernanceTokenAddress({}), erc_20_abi, signer);
    const base_token_contract = new ethers.Contract(await vault_contract.getBaseTokenAddress({}), mintable_erc_20_abi, signer);
    const c_token_contract = new ethers.Contract(await vault_contract.getCTokenAddress({}), mintable_erc_20_abi, signer);
    const i_token_contract = new ethers.Contract(await vault_contract.getITokenAddress({}), mintable_erc_20_abi, signer);

    try {

      if (await vault_contract.getLockedState()) {
        var vaultLocked = "Locked";
      } else {
        var vaultLocked = "Open";
      }

      try { vaultToken.innerHTML = await base_token_contract.name({}); } catch (error) { }
      try { oracleCondition.innerHTML = await vault_contract.getOracleCondition(); } catch (error) { }
      try { baseTokenAmount.innerHTML = await base_token_contract.balanceOf(account, {}); } catch (error) { }
      try { cTokenAmount.innerHTML = await c_token_contract.balanceOf(account, {}); } catch (error) { }
      try { iTokenAmount.innerHTML = await i_token_contract.balanceOf(account, {}); } catch (error) { }
      try { vaultStatus.innerHTML = vaultLocked; } catch (error) { }
      try { governanceTokenAmount.innerHTML = await governance_token_contract.balanceOf(account, {}); } catch (error) { }
      try { accruedFeesAmount.innerHTML = await vault_contract.getOwedFees({}); } catch (error) { }

      // dispute status
      var disputeOpen = await vault_contract.getDisputeStatus();
      var disputeEndTime = await vault_contract.getDisputeEndTime();

      if (!disputeOpen) {
        var votingPhaseLabel = "No Unlock Request Pending (Request Unlock To Open Vault)";
      } else if (disputeOpen && (parseInt(disputeEndTime) > (Date.now() / 1000))) {
        var remainingHours = (parseInt(disputeEndTime) - (Date.now() / 1000)) / (60 * 60)
        var votingPhaseLabel = "Unlock Request Voting Open (Remaining Time: " + remainingHours + "h)";
      } else {
        var votingPhaseLabel = "Unlock Request Voting Finished (Resolve Dispute To Finalize)";
      }

      try { votingPhase.innerHTML = votingPhaseLabel; } catch (error) { }

      // dispute initiation amount
      var totalITokenSupply = await i_token_contract.totalSupply({});
      var initiationAmountDenominator = await vault_contract.getInitiationAmountDenominator();

      var requiredDisputeInitiationAmount = Math.floor(parseInt(totalITokenSupply) / parseInt(initiationAmountDenominator));

      try { unlockAmount.innerHTML = requiredDisputeInitiationAmount; } catch (error) { }

      // voting reward
      try { baseTokenReward.innerHTML = await vault_contract.getOwedBaseTokenRewards(); } catch (error) { }
      try { governanceTokenReward.innerHTML = await vault_contract.getOwedGovernanceTokenRewards(); } catch (error) { }

      // state based base token allowance for voting visibility
      const baseTokenAllowance = await base_token_contract.allowance(account, vault_address, {});

      if (!disputeOpen && (parseInt(baseTokenAllowance) < parseInt(requiredDisputeInitiationAmount))) {
        try { allowBaseTokenForVotingButton.hidden = false; } catch (error) { }
      }
      else {
        try { allowBaseTokenForVotingButton.hidden = true; } catch (error) { }
      }

      // set base token decimals
      try { base_token_decimals = await base_token_contract.decimals(); } catch (error) { }

    } catch (error) {
      console.log(error);
    }

  }

}

// conversion & redemption

async function allowBaseToken() {

  if (connected) {

    const convertInput = document.getElementById("convertInput").value;

    // check minimum conversion amount
    if (convertInput <= 0) {
      alert("Conversion amount must be greater than 0");
      return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const vault_contract = new ethers.Contract(vault_address, vault_abi, signer);
    const base_token_contract = new ethers.Contract(await vault_contract.getBaseTokenAddress({}), mintable_erc_20_abi, signer);

    // check base token balance
    const baseTokenBalance = await base_token_contract.balanceOf(account, {});

    if (parseInt(baseTokenBalance) < parseInt(convertInput)) {
      alert("Insufficient funds!");
      return;
    }

    // check base token allowance
    const baseTokenAllowance = await base_token_contract.allowance(account, vault_address, {});

    if (parseInt(baseTokenAllowance) < parseInt(convertInput)) {
      await base_token_contract.approve(vault_address, convertInput, {});
    }
    else {
      alert("Your spending allowance is already high enough to convert. Current allowance is: " + baseTokenAllowance);
    }

  } else {
    await connect();
  }

}

async function convert() {

  // TODO: a minimum fee of 1 must be enforced in the contract

  if (connected) {

    const convertInput = document.getElementById("convertInput").value;

    // check minimum conversion amount
    if (convertInput <= 0) {
      alert("Conversion amount must be greater than 0");
      return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const vault_contract = new ethers.Contract(vault_address, vault_abi, signer);
    const base_token_contract = new ethers.Contract(await vault_contract.getBaseTokenAddress({}), mintable_erc_20_abi, signer);

    // check base token balance
    const baseTokenBalance = await base_token_contract.balanceOf(account, {});

    if (parseInt(baseTokenBalance) < parseInt(convertInput)) {
      alert("Insufficient funds!");
      return;
    }

    // check base token allowance
    const baseTokenAllowance = await base_token_contract.allowance(account, vault_address, {});

    if (parseInt(baseTokenAllowance) < parseInt(convertInput)) {
      alert("Increase your spending allowance before converting. Current allowance is: " + baseTokenAllowance);
      return;
    }

    // convert
    await vault_contract.convert(convertInput, {});

  } else {
    await connect();
  }

}

async function redeem() {

  if (connected) {

    const redeemInput = document.getElementById("redeemInput").value;

    // check minimum redemption amount
    if (redeemInput <= 0) {
      alert("Redemption amount must be greater than 0");
      return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const vault_contract = new ethers.Contract(vault_address, vault_abi, signer);
    const base_token_contract = new ethers.Contract(await vault_contract.getBaseTokenAddress({}), mintable_erc_20_abi, signer);
    const c_token_contract = new ethers.Contract(await vault_contract.getCTokenAddress({}), mintable_erc_20_abi, signer);
    const i_token_contract = new ethers.Contract(await vault_contract.getITokenAddress({}), mintable_erc_20_abi, signer);

    // check vault status
    if (await vault_contract.getLockedState()) {

      // check c and i token balance
      const cTokenBalance = await c_token_contract.balanceOf(account, {});
      const iTokenBalance = await i_token_contract.balanceOf(account, {});

      if ((parseInt(cTokenBalance) < parseInt(redeemInput)) || (parseInt(iTokenBalance) < parseInt(redeemInput))) {
        alert("Insufficient funds!");
        return;
      }

      // redeem
      await vault_contract.redeem(redeemInput, {});

    } else {

      // check i token balance
      const iTokenBalance = await i_token_contract.balanceOf(account, {});

      if (parseInt(iTokenBalance) < parseInt(redeemInput)) {
        alert("Insufficient funds!");
        return;
      }

      // redeem
      await vault_contract.redeem(redeemInput, {});

    }

  } else {
    await connect();
  }

}

// fee withdrawal

async function withdrawFees() {

  if (connected) {

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const vault_contract = new ethers.Contract(vault_address, vault_abi, signer);

    const owedFees = await vault_contract.getOwedFees({});

    // check if there are some fees to withdraw
    if (owedFees <= 0) {
      alert("Owed fees must be greater than 0");
      return;
    }

    // withdraw fees
    await vault_contract.withdrawOwedFees({});

  } else {
    await connect();
  }

}

// voting

async function requestUnlock() {

  if (connected) {

    // connect to contracts
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const vault_contract = new ethers.Contract(vault_address, vault_abi, signer);
    const base_token_contract = new ethers.Contract(await vault_contract.getBaseTokenAddress({}), mintable_erc_20_abi, signer);
    const i_token_contract = new ethers.Contract(await vault_contract.getITokenAddress({}), mintable_erc_20_abi, signer);

    // check if no dispute is open
    var disputeOpen = await vault_contract.getDisputeStatus();

    if (disputeOpen) {
      alert("An unlock request has already been opened");
      return;
    }

    // check if user has enough funds to request an unlock
    var totalITokenSupply = await i_token_contract.totalSupply({});
    var initiationAmountDenominator = await vault_contract.getInitiationAmountDenominator();
    var requiredDisputeInitiationAmount = Math.floor(parseInt(totalITokenSupply) / parseInt(initiationAmountDenominator));
    var userBaseTokens = await base_token_contract.balanceOf(account, {});

    if (parseInt(requiredDisputeInitiationAmount) > parseInt(userBaseTokens)) {
      alert("You don't have enough base tokens to open an unlock request");
      return;
    }

    // check base token allowance
    const baseTokenAllowance = await base_token_contract.allowance(account, vault_address, {});

    if (parseInt(baseTokenAllowance) < parseInt(requiredDisputeInitiationAmount)) {
      alert("Increase your base token allowance before requesting unlock. Current allowance is: " + baseTokenAllowance);
      return;
    }

    // request unlock
    await vault_contract.initiateDispute();

  } else {
    await connect();
  }

}

async function resolveDispute() {

  if (connected) {

    // connect to contracts
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const vault_contract = new ethers.Contract(vault_address, vault_abi, signer);

    // check if dispute is open
    var disputeOpen = await vault_contract.getDisputeStatus();
    var disputeEndTime = await vault_contract.getDisputeEndTime();

    if (!disputeOpen) {
      alert("No unlock request is open at the moment");
      return;
    }

    if (parseInt(disputeEndTime) > (Date.now() / 1000)) {
      alert("The unlock request is still in the voting phase");
      return;
    }

    // resolve dispute
    await vault_contract.resolveDispute();

  } else {
    await connect();
  }

}

async function vote() {

  if (connected) {

    // connect to contracts
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const vault_contract = new ethers.Contract(vault_address, vault_abi, signer);
    const governance_token_contract = new ethers.Contract(await vault_contract.getGovernanceTokenAddress({}), erc_20_abi, signer);

    // check if voting is open
    var disputeOpen = await vault_contract.getDisputeStatus();
    var disputeEndTime = await vault_contract.getDisputeEndTime();

    if (!disputeOpen) {
      alert("No unlock request is open at the moment");
      return;
    }

    if (parseInt(disputeEndTime) <= (Date.now() / 1000)) {
      alert("The voting phase is already over");
      return;
    }

    const voteWeight = document.getElementById("voteWeight").value;
    const voteValue = document.getElementById("voteValue").value;

    // check if vote weight is greater than 0
    if (voteWeight <= 0) {
      alert("Vote weight must be greater than 0");
      return;
    }

    // check governance token balance
    const governanceTokenBalance = await governance_token_contract.balanceOf(account, {});

    if (parseInt(governanceTokenBalance) < parseInt(voteWeight)) {
      alert("Insufficient governance tokens for the selected vote weight!");
      return;
    }

    // check governance token allowance
    const governanceTokenAllowance = await governance_token_contract.allowance(account, vault_address, {});

    if (parseInt(governanceTokenAllowance) < parseInt(voteWeight)) {
      alert("Increase your governance token allowance before converting. Current allowance is: " + governanceTokenAllowance);
      return;
    }

    // vote
    await vault_contract.vote(parseInt(voteValue), parseInt(voteWeight), {});

  } else {
    await connect();
  }

}

async function allowBaseTokenForVoting() {

  if (connected) {

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const vault_contract = new ethers.Contract(vault_address, vault_abi, signer);
    const base_token_contract = new ethers.Contract(await vault_contract.getBaseTokenAddress({}), mintable_erc_20_abi, signer);
    const i_token_contract = new ethers.Contract(await vault_contract.getITokenAddress({}), mintable_erc_20_abi, signer);

    // check if no dispute is open
    var disputeOpen = await vault_contract.getDisputeStatus();

    if (disputeOpen) {
      alert("An unlock request has already been opened");
      return;
    }

    var totalITokenSupply = await i_token_contract.totalSupply({});
    var initiationAmountDenominator = await vault_contract.getInitiationAmountDenominator();

    var requiredDisputeInitiationAmount = Math.floor(parseInt(totalITokenSupply) / parseInt(initiationAmountDenominator));

    // check base token balance
    const baseTokenBalance = await base_token_contract.balanceOf(account, {});

    if (parseInt(baseTokenBalance) < parseInt(requiredDisputeInitiationAmount)) {
      alert("Insufficient base tokens!");
      return;
    }

    // check base token allowance
    const baseTokenAllowance = await base_token_contract.allowance(account, vault_address, {});

    if (parseInt(baseTokenAllowance) < parseInt(requiredDisputeInitiationAmount)) {
      await base_token_contract.approve(vault_address, requiredDisputeInitiationAmount, {});
    }
    else {
      alert("Your spending allowance is already high enough. Current allowance is: " + baseTokenAllowance);
    }

  } else {
    await connect();
  }

}

async function allowGovernanceTokenForVoting() {

  if (connected) {

    const voteWeight = document.getElementById("voteWeight").value;

    // check if vote weight is greater than 0
    if (voteWeight <= 0) {
      alert("Vote weight must be greater than 0");
      return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const vault_contract = new ethers.Contract(vault_address, vault_abi, signer);
    const governance_token_contract = new ethers.Contract(await vault_contract.getGovernanceTokenAddress({}), erc_20_abi, signer);

    // check if voting is open
    var disputeOpen = await vault_contract.getDisputeStatus();
    var disputeEndTime = await vault_contract.getDisputeEndTime();

    if (!disputeOpen) {
      alert("No unlock request is open at the moment");
      return;
    }

    if (parseInt(disputeEndTime) <= (Date.now() / 1000)) {
      alert("The voting phase is already over");
      return;
    }

    // check governance token balance
    const governanceTokenBalance = await governance_token_contract.balanceOf(account, {});

    if (parseInt(governanceTokenBalance) < parseInt(voteWeight)) {
      alert("Insufficient governance tokens for the selected vote weight!");
      return;
    }

    // check governance token allowance
    const governanceTokenAllowance = await governance_token_contract.allowance(account, vault_address, {});

    if (parseInt(governanceTokenAllowance) < parseInt(voteWeight)) {
      await governance_token_contract.approve(vault_address, voteWeight, {});
    }
    else {
      alert("Your governance token allowance is already high enough. Current allowance is: " + governanceTokenAllowance);
    }

  } else {
    await connect();
  }

}

// voting reward

async function withdrawBaseTokenReward() {

  if (connected) {

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const vault_contract = new ethers.Contract(vault_address, vault_abi, signer);

    const owedBaseTokens = await vault_contract.getOwedBaseTokenRewards({});

    // check if there are some fees to withdraw
    if (owedBaseTokens <= 0) {
      alert("Owed fees must be greater than 0");
      return;
    }

    // withdraw fees
    await vault_contract.withdrawBaseTokenReward({});

  } else {
    await connect();
  }

}

async function withdrawGovernanceTokenReward() {

  if (connected) {

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const vault_contract = new ethers.Contract(vault_address, vault_abi, signer);

    const owedGovernanceTokens = await vault_contract.getOwedGovernanceTokenRewards({});

    // check if there are some fees to withdraw
    if (owedGovernanceTokens <= 0) {
      alert("Owed fees must be greater than 0");
      return;
    }

    // withdraw fees
    await vault_contract.withdrawGovernanceTokenReward({});

  } else {
    await connect();
  }

}

// oninput ui functions

async function convertInputChange() {

  if (connected) {

    const convertInput = document.getElementById("convertInput").value;

    // check if current allowance not big enough

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const vault_contract = new ethers.Contract(vault_address, vault_abi, signer);
    const base_token_contract = new ethers.Contract(await vault_contract.getBaseTokenAddress({}), mintable_erc_20_abi, signer);

    // check base token allowance
    const baseTokenAllowance = await base_token_contract.allowance(account, vault_address, {});

    console.log(baseTokenAllowance);

    if (parseInt(baseTokenAllowance) < parseInt(convertInput)) {
      allowBaseTokenButton.hidden = false;
    } else {
      allowBaseTokenButton.hidden = true;
    }

  }

}

async function voteWeightInputChange() {

  if (connected) {

    const voteWeight = document.getElementById("voteWeight").value;

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const vault_contract = new ethers.Contract(vault_address, vault_abi, signer);
    const governance_token_contract = new ethers.Contract(await vault_contract.getGovernanceTokenAddress({}), erc_20_abi, signer);

    // check if voting is open
    var disputeOpen = await vault_contract.getDisputeStatus();
    var disputeEndTime = await vault_contract.getDisputeEndTime();

    // check governance token allowance
    const governanceTokenBalance = await governance_token_contract.balanceOf(account, {});
    const governanceTokenAllowance = await governance_token_contract.allowance(account, vault_address, {});

    if (disputeOpen && (parseInt(disputeEndTime) > (Date.now() / 1000)) && (parseInt(governanceTokenAllowance) < parseInt(voteWeight))) {
      allowGovernanceTokenForVotingButton.hidden = false;
    } else {
      allowGovernanceTokenForVotingButton.hidden = true;
    }

  }

}