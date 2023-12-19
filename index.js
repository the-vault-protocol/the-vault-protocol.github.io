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
const lockedTokens = document.getElementById("lockedTokens");

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

function format_number(number, decimals) {
  return ethers.utils.formatUnits(number, decimals);
}

function parseBigNumber(value, decimals) {
  try {
    return ethers.BigNumber.from(value).mul(ethers.utils.parseUnits("1", 18));
  } catch (error) {
    return ethers.BigNumber.from("0");
  }
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
    const governance_token_contract = new ethers.Contract(
      await vault_contract.getGovernanceTokenAddress({}),
      erc_20_abi,
      signer
    );
    const base_token_contract = new ethers.Contract(
      await vault_contract.getBaseTokenAddress({}),
      mintable_erc_20_abi,
      signer
    );
    const c_token_contract = new ethers.Contract(
      await vault_contract.getCTokenAddress({}),
      mintable_erc_20_abi,
      signer
    );
    const i_token_contract = new ethers.Contract(
      await vault_contract.getITokenAddress({}),
      mintable_erc_20_abi,
      signer
    );

    try {

      // set base token decimals
      try { base_token_decimals = await base_token_contract.decimals(); } catch (error) { }

      if (await vault_contract.getLockedState()) {
        var vaultLocked = "Locked";
      } else {
        var vaultLocked = "Open";
      }

      try { vaultToken.innerHTML = await base_token_contract.name({}); } catch (error) { }
      try { vaultStatus.innerHTML = vaultLocked; } catch (error) { }
      try { oracleCondition.innerHTML = await vault_contract.getOracleCondition(); } catch (error) { }
      try {
        baseTokenAmount.innerHTML = format_number(
          await base_token_contract.balanceOf(account, {}), base_token_decimals
        );
      } catch (error) { }
      try {
        cTokenAmount.innerHTML = format_number(
          await c_token_contract.balanceOf(account, {}), c_token_decimals
        );
      } catch (error) { }
      try {
        iTokenAmount.innerHTML = format_number(
          await i_token_contract.balanceOf(account, {}), i_token_decimals
        );
      } catch (error) { }
      try {
        governanceTokenAmount.innerHTML = format_number(
          await governance_token_contract.balanceOf(account, {}), governance_token_decimals
        );
      } catch (error) { }
      try {
        accruedFeesAmount.innerHTML = format_number(
          await vault_contract.getOwedFees({}), base_token_decimals
        );
      } catch (error) { }

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

      var requiredDisputeInitiationAmount = totalITokenSupply.div(initiationAmountDenominator);

      try {
        unlockAmount.innerHTML = format_number(
          requiredDisputeInitiationAmount, base_token_decimals
        );
      } catch (error) { }

      // voting reward
      try {
        baseTokenReward.innerHTML = format_number(
          await vault_contract.getOwedBaseTokenRewards(), base_token_decimals
        );
      } catch (error) { }
      try {
        governanceTokenReward.innerHTML = format_number(
          await vault_contract.getOwedGovernanceTokenRewards(), governance_token_decimals
        );
      } catch (error) { }

      // state based base token allowance for voting visibility
      const baseTokenAllowance = await base_token_contract.allowance(account, vault_address, {});

      if (!disputeOpen && (baseTokenAllowance.lt(requiredDisputeInitiationAmount))) {
        try { allowBaseTokenForVotingButton.hidden = false; } catch (error) { }
      }
      else {
        try { allowBaseTokenForVotingButton.hidden = true; } catch (error) { }
      }

      // get locked base tokens
      try {
        lockedTokens.innerHTML = format_number(
          await base_token_contract.balanceOf(vault_address, {}), base_token_decimals
        );
      } catch (error) { }

    } catch (error) {
      console.log(error);
    }

  }

}

// conversion & redemption

async function allowBaseToken() {

  if (connected) {

    const convertInput = parseBigNumber(document.getElementById("convertInput").value, base_token_decimals);

    // check minimum conversion amount
    if (convertInput.lte(0)) {
      alert("Conversion amount must be greater than 0");
      return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const vault_contract = new ethers.Contract(vault_address, vault_abi, signer);
    const base_token_contract = new ethers.Contract(
      await vault_contract.getBaseTokenAddress({}),
      mintable_erc_20_abi,
      signer
    );

    // check base token balance
    const baseTokenBalance = await base_token_contract.balanceOf(account, {});

    if (baseTokenBalance.lt(convertInput)) {
      alert("Insufficient funds!");
      return;
    }

    // check base token allowance
    const baseTokenAllowance = await base_token_contract.allowance(account, vault_address, {});

    if (baseTokenAllowance.lt(convertInput)) {

      const tx = await base_token_contract.approve(vault_address, convertInput, {});

      // wait for confirmation
      const pollInterval = setInterval(async () => {
        const receipt = await provider.getTransactionReceipt(tx.hash);
        if (receipt && receipt.confirmations > 0) {
          clearInterval(pollInterval);
          window.location.reload();
        }
      }, 3000);

    }
    else {
      alert(
        "Your spending allowance is already high enough to convert. Current allowance is: " +
        format_number(baseTokenAllowance, base_token_decimals)
      );
    }

  } else {
    await connect();
  }

}

async function convert() {

  if (connected) {

    const convertInput = parseBigNumber(document.getElementById("convertInput").value, base_token_decimals);

    // check minimum conversion amount
    if (convertInput.lte(0)) {
      alert("Conversion amount must be greater than 0");
      return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const vault_contract = new ethers.Contract(vault_address, vault_abi, signer);
    const base_token_contract = new ethers.Contract(
      await vault_contract.getBaseTokenAddress({}),
      mintable_erc_20_abi,
      signer
    );

    // check base token balance
    const baseTokenBalance = await base_token_contract.balanceOf(account, {});

    if (baseTokenBalance.lt(convertInput)) {
      alert("Insufficient funds!");
      return;
    }

    // check base token allowance
    const baseTokenAllowance = await base_token_contract.allowance(account, vault_address, {});

    if (baseTokenAllowance.lt(convertInput)) {
      alert(
        "Increase your spending allowance before converting. Current allowance is: " +
        format_number(baseTokenAllowance, base_token_decimals)
      );
      return;
    }

    // convert
    const tx = await vault_contract.convert(convertInput, {});

    // wait for confirmation
    const pollInterval = setInterval(async () => {
      const receipt = await provider.getTransactionReceipt(tx.hash);
      if (receipt && receipt.confirmations > 0) {
        clearInterval(pollInterval);
        window.location.reload();
      }
    }, 3000);

  } else {
    await connect();
  }

}

async function redeem() {

  if (connected) {

    const redeemInput = parseBigNumber(document.getElementById("redeemInput").value, base_token_decimals);

    // check minimum redemption amount
    if (redeemInput.lte(0)) {
      alert("Redemption amount must be greater than 0");
      return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const vault_contract = new ethers.Contract(vault_address, vault_abi, signer);
    const c_token_contract = new ethers.Contract(
      await vault_contract.getCTokenAddress({}),
      mintable_erc_20_abi,
      signer
    );
    const i_token_contract = new ethers.Contract(
      await vault_contract.getITokenAddress({}),
      mintable_erc_20_abi,
      signer
    );

    // check vault status
    if (await vault_contract.getLockedState()) {

      // check c and i token balance
      const cTokenBalance = await c_token_contract.balanceOf(account, {});
      const iTokenBalance = await i_token_contract.balanceOf(account, {});

      if ((cTokenBalance.lt(redeemInput)) || (iTokenBalance.lt(redeemInput))) {
        alert("Insufficient funds!");
        return;
      }

      // redeem
      const tx = await vault_contract.redeem(redeemInput, {});

      // wait for confirmation
      const pollInterval = setInterval(async () => {
        const receipt = await provider.getTransactionReceipt(tx.hash);
        if (receipt && receipt.confirmations > 0) {
          clearInterval(pollInterval);
          window.location.reload();
        }
      }, 3000);

    } else {

      // check i token balance
      const iTokenBalance = await i_token_contract.balanceOf(account, {});

      if (iTokenBalance.lt(redeemInput)) {
        alert("Insufficient funds!");
        return;
      }

      // redeem
      const tx = await vault_contract.redeem(redeemInput, {});

      // wait for confirmation
      const pollInterval = setInterval(async () => {
        const receipt = await provider.getTransactionReceipt(tx.hash);
        if (receipt && receipt.confirmations > 0) {
          clearInterval(pollInterval);
          window.location.reload();
        }
      }, 3000);

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
    if (owedFees.lte(0)) {
      alert("Owed fees must be greater than 0");
      return;
    }

    // withdraw fees
    const tx = await vault_contract.withdrawOwedFees({});

    // wait for confirmation
    const pollInterval = setInterval(async () => {
      const receipt = await provider.getTransactionReceipt(tx.hash);
      if (receipt && receipt.confirmations > 0) {
        clearInterval(pollInterval);
        window.location.reload();
      }
    }, 3000);

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
    const base_token_contract = new ethers.Contract(
      await vault_contract.getBaseTokenAddress({}),
      mintable_erc_20_abi,
      signer
    );
    const i_token_contract = new ethers.Contract(
      await vault_contract.getITokenAddress({}),
      mintable_erc_20_abi,
      signer
    );

    // check if no dispute is open
    var disputeOpen = await vault_contract.getDisputeStatus();

    if (disputeOpen) {
      alert("An unlock request has already been opened");
      return;
    }

    // check if user has enough funds to request an unlock
    var totalITokenSupply = await i_token_contract.totalSupply({});
    var initiationAmountDenominator = await vault_contract.getInitiationAmountDenominator();
    var requiredDisputeInitiationAmount = totalITokenSupply.div(initiationAmountDenominator);
    var userBaseTokens = await base_token_contract.balanceOf(account, {});

    if (userBaseTokens.lt(requiredDisputeInitiationAmount)) {
      alert("You don't have enough base tokens to open an unlock request");
      return;
    }

    // check base token allowance
    const baseTokenAllowance = await base_token_contract.allowance(account, vault_address, {});

    if (baseTokenAllowance.lt(requiredDisputeInitiationAmount)) {
      alert(
        "Increase your base token allowance before requesting unlock. Current allowance is: " +
        baseTokenAllowance
      );
      return;
    }

    // request unlock
    const tx = await vault_contract.initiateDispute();

    // wait for confirmation
    const pollInterval = setInterval(async () => {
      const receipt = await provider.getTransactionReceipt(tx.hash);
      if (receipt && receipt.confirmations > 0) {
        clearInterval(pollInterval);
        window.location.reload();
      }
    }, 3000);

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
    const tx = await vault_contract.resolveDispute();

    // wait for confirmation
    const pollInterval = setInterval(async () => {
      const receipt = await provider.getTransactionReceipt(tx.hash);
      if (receipt && receipt.confirmations > 0) {
        clearInterval(pollInterval);
        window.location.reload();
      }
    }, 3000);

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
    const governance_token_contract = new ethers.Contract(
      await vault_contract.getGovernanceTokenAddress({}),
      erc_20_abi,
      signer
    );

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

    const voteWeight = parseBigNumber(document.getElementById("voteWeight").value, governance_token_decimals);
    const voteValue = document.getElementById("voteValue").value;

    // check if vote weight is greater than 0
    if (voteWeight.lte(0)) {
      alert("Vote weight must be greater than 0");
      return;
    }

    // check governance token balance
    const governanceTokenBalance = await governance_token_contract.balanceOf(account, {});

    if (governanceTokenBalance.lt(voteWeight)) {
      alert("Insufficient governance tokens for the selected vote weight!");
      return;
    }

    // check governance token allowance
    const governanceTokenAllowance = await governance_token_contract.allowance(
      account,
      vault_address,
      {}
    );

    if (governanceTokenAllowance.lt(voteWeight)) {
      alert(
        "Increase your governance token allowance before converting. Current allowance is: " +
        governanceTokenAllowance
      );
      return;
    }

    // vote
    const tx = await vault_contract.vote(parseInt(voteValue), voteWeight, {});

    // wait for confirmation
    const pollInterval = setInterval(async () => {
      const receipt = await provider.getTransactionReceipt(tx.hash);
      if (receipt && receipt.confirmations > 0) {
        clearInterval(pollInterval);
        window.location.reload();
      }
    }, 3000);

  } else {
    await connect();
  }

}

async function allowBaseTokenForVoting() {

  if (connected) {

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const vault_contract = new ethers.Contract(
      vault_address,
      vault_abi,
      signer
    );
    const base_token_contract = new ethers.Contract(
      await vault_contract.getBaseTokenAddress({}),
      mintable_erc_20_abi,
      signer
    );
    const i_token_contract = new ethers.Contract(
      await vault_contract.getITokenAddress({}),
      mintable_erc_20_abi,
      signer
    );

    // check if no dispute is open
    var disputeOpen = await vault_contract.getDisputeStatus();

    if (disputeOpen) {
      alert("An unlock request has already been opened");
      return;
    }

    var totalITokenSupply = await i_token_contract.totalSupply({});
    var initiationAmountDenominator = await vault_contract.getInitiationAmountDenominator();
    var requiredDisputeInitiationAmount = totalITokenSupply.div(initiationAmountDenominator);

    // check base token balance
    const baseTokenBalance = await base_token_contract.balanceOf(account, {});

    if (baseTokenBalance.lt(requiredDisputeInitiationAmount)) {
      alert("Insufficient base tokens!");
      return;
    }

    // check base token allowance
    const baseTokenAllowance = await base_token_contract.allowance(account, vault_address, {});

    if (baseTokenAllowance.lt(requiredDisputeInitiationAmount)) {

      const tx = await base_token_contract.approve(vault_address, requiredDisputeInitiationAmount, {});

      // wait for confirmation
      const pollInterval = setInterval(async () => {
        const receipt = await provider.getTransactionReceipt(tx.hash);
        if (receipt && receipt.confirmations > 0) {
          clearInterval(pollInterval);
          window.location.reload();
        }
      }, 3000);

    }
    else {
      alert(
        "Your spending allowance is already high enough. Current allowance is: " +
        baseTokenAllowance
      );
    }

  } else {
    await connect();
  }

}

async function allowGovernanceTokenForVoting() {

  if (connected) {

    const voteWeight = parseBigNumber(document.getElementById("voteWeight").value, governance_token_decimals);

    // check if vote weight is greater than 0
    if (voteWeight.lte(0)) {
      alert("Vote weight must be greater than 0");
      return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const vault_contract = new ethers.Contract(vault_address, vault_abi, signer);
    const governance_token_contract = new ethers.Contract(
      await vault_contract.getGovernanceTokenAddress({}),
      erc_20_abi,
      signer
    );

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

    if (governanceTokenBalance.lt(voteWeight)) {
      alert("Insufficient governance tokens for the selected vote weight!");
      return;
    }

    // check governance token allowance
    const governanceTokenAllowance = await governance_token_contract.allowance(account, vault_address, {});

    if (governanceTokenAllowance.lt(voteWeight)) {

      const tx = await governance_token_contract.approve(vault_address, voteWeight, {});

      // wait for confirmation
      const pollInterval = setInterval(async () => {
        const receipt = await provider.getTransactionReceipt(tx.hash);
        if (receipt && receipt.confirmations > 0) {
          clearInterval(pollInterval);
          window.location.reload();
        }
      }, 3000);

    }
    else {
      alert(
        "Your governance token allowance is already high enough. Current allowance is: " +
        governanceTokenAllowance
      );
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
    if (owedBaseTokens.lte(0)) {
      alert("Owed fees must be greater than 0");
      return;
    }

    // withdraw fees
    const tx = await vault_contract.withdrawBaseTokenReward({});

    // wait for confirmation
    const pollInterval = setInterval(async () => {
      const receipt = await provider.getTransactionReceipt(tx.hash);
      if (receipt && receipt.confirmations > 0) {
        clearInterval(pollInterval);
        window.location.reload();
      }
    }, 3000);

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
    if (owedGovernanceTokens.lte(0)) {
      alert("Owed fees must be greater than 0");
      return;
    }

    // withdraw fees
    const tx = await vault_contract.withdrawGovernanceTokenReward({});

    // wait for confirmation
    const pollInterval = setInterval(async () => {
      const receipt = await provider.getTransactionReceipt(tx.hash);
      if (receipt && receipt.confirmations > 0) {
        clearInterval(pollInterval);
        window.location.reload();
      }
    }, 3000);

  } else {
    await connect();
  }

}

// oninput ui functions

async function convertInputChange() {

  if (connected) {

    const convertInput = parseBigNumber(document.getElementById("convertInput").value, base_token_decimals);

    // check if current allowance not big enough
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const vault_contract = new ethers.Contract(vault_address, vault_abi, signer);
    const base_token_contract = new ethers.Contract(
      await vault_contract.getBaseTokenAddress({}),
      mintable_erc_20_abi,
      signer
    );

    // check base token allowance
    const baseTokenAllowance = await base_token_contract.allowance(account, vault_address, {});

    if (baseTokenAllowance.lt(convertInput)) {
      allowBaseTokenButton.hidden = false;
    } else {
      allowBaseTokenButton.hidden = true;
    }

  }

}

async function voteWeightInputChange() {

  if (connected) {

    const voteWeight = parseBigNumber(document.getElementById("voteWeight").value, governance_token_decimals);

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const vault_contract = new ethers.Contract(vault_address, vault_abi, signer);
    const governance_token_contract = new ethers.Contract(
      await vault_contract.getGovernanceTokenAddress({}),
      erc_20_abi,
      signer
    );

    // check if voting is open
    var disputeOpen = await vault_contract.getDisputeStatus();
    var disputeEndTime = await vault_contract.getDisputeEndTime();

    // check governance token allowance
    const governanceTokenAllowance = await governance_token_contract.allowance(account, vault_address, {});

    if (
      disputeOpen &&
      (parseInt(disputeEndTime) > (Date.now() / 1000)) &&
      (governanceTokenAllowance.lt(voteWeight))
    ) {
      allowGovernanceTokenForVotingButton.hidden = false;
    } else {
      allowGovernanceTokenForVotingButton.hidden = true;
    }

  }

}