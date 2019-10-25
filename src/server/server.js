import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import Config from "./config.json";
import Web3 from "web3";
import express from "express";

const config = Config["localhost"];
const web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace("http", "ws")));
web3.eth.defaultAccount = web3.eth.accounts[0];
const flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

const GAS_LIMIT = 4500000;
const ORACLES_COUNT = 60;
const ORACLE_ACCOUNTS_START_INDEX = 20;
const ORACLE_ACCOUNTS_END_INDEX = ORACLE_ACCOUNTS_START_INDEX + ORACLES_COUNT;

const oracleIndexes = {};
let accounts;

// Initialization
(async () => {
  // Get accounts
  await new Promise(resolver => {
    web3.eth.getAccounts((error, accounts_) => {
      accounts = accounts_;
      resolver();
    });
  });

  // Register oracles
  const fee = await flightSuretyApp.methods.REGISTRATION_FEE().call();
  const registerOracleWithFee = account => registerOracle(account, fee);

  const registrationPromises = accounts
    .slice(ORACLE_ACCOUNTS_START_INDEX, ORACLE_ACCOUNTS_END_INDEX)
    .map(registerOracleWithFee);
  await Promise.all(registrationPromises);
})();

function registerOracle(account, fee) {
  console.log(`Registering oracle for account ${account}...`);
  return flightSuretyApp.methods
    .registerOracle()
    .send({ from: account, value: fee, gas: GAS_LIMIT })
    .then(() => flightSuretyApp.methods.getMyIndexes().call({ from: account }))
    .then(indexes => {
      oracleIndexes[account] = indexes;
      console.log(`Oracle registered for account ${account} with indexes ${indexes}`);
    });
}

// Watch OracleRequest
flightSuretyApp.events.OracleRequest(
  {
    fromBlock: 0
  },
  function(error, event) {
    if (error) console.log(error);
    handleOracleRequest(event);
  }
);

function handleOracleRequest(event) {
  console.log("Received OracleRequest - Fetch Flight Status with parameters :\n", event.returnValues);
  const { index, airline, flight, timestamp } = event.returnValues;

  Object.entries(oracleIndexes)
    .filter(([_, indexes]) => indexes.includes(index))
    .forEach(([address, indexes]) => {
      const statusCode = getRandomStatusCode();
      console.log(
        `OracleRequest event applies to oracle with account ${address} and indexes ${indexes}\n\tRandom status code : ${statusCode}`
      );

      flightSuretyApp.methods
        .submitOracleResponse(Number.parseInt(index, 10), airline, flight, Number.parseInt(timestamp), statusCode)
        .send({ from: address, gas: GAS_LIMIT });
    });
}

function getRandomStatusCode() {
  return getRandomInt(0, 6) * 10;
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

const app = express();
app.get("/api", (req, res) => {
  res.send({
    message: "An API for use with your Dapp!"
  });
});

export default app;
