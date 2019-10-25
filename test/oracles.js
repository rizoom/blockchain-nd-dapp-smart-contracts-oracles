const Test = require("../config/testConfig.js");
const truffleAssert = require('truffle-assertions');

const TEST_ORACLES_COUNT = 20;
const ORACLE_ACCOUNTS_START_INDEX = 20;
const ORACLE_ACCOUNTS_END_INDEX = ORACLE_ACCOUNTS_START_INDEX + TEST_ORACLES_COUNT;

// Watch contract events
const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;

contract("Oracles", async accounts => {
  let config;

  before("setup contract", async () => {
    config = await Test.Config(accounts);

    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  it("can register oracles", async () => {
    // ARRANGE
    let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();

    // ACT
    for (let a = ORACLE_ACCOUNTS_START_INDEX; a < ORACLE_ACCOUNTS_END_INDEX; a++) {
      await config.flightSuretyApp.registerOracle({ from: accounts[a], value: fee });
      let result = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a] });
      console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
      console.log("Result", result);
    }
  });

  it("can request flight status", async () => {
    // ARRANGE
    let flight = "ND1309"; // Course number
    let timestamp = Math.floor(Date.now() / 1000);

    // Submit a request for oracles to get status information for a flight
    const result = await config.flightSuretyApp.fetchFlightStatus(config.firstAirline.address, flight, timestamp);

    // OracleRequest event is displayed, we can see event details
    truffleAssert.prettyPrintEmittedEvents(result);

    // ACT

    // Since the Index assigned to each test account is opaque by design
    // loop through all the accounts and for each account, all its Indexes (indices?)
    // and submit a response. The contract will reject a submission if it was
    // not requested so while sub-optimal, it's a good test of that feature
    for (let a = ORACLE_ACCOUNTS_START_INDEX; a < ORACLE_ACCOUNTS_END_INDEX; a++) {
      // Get oracle information
      let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a] });
      for (let idx = 0; idx < 3; idx++) {
        try {
          // Submit a response...it will only be accepted if there is an Index match
          const result = await config.flightSuretyApp.submitOracleResponse(
            oracleIndexes[idx],
            config.firstAirline.address,
            flight,
            timestamp,
            STATUS_CODE_ON_TIME,
            { from: accounts[a] }
          );

          // Emitted event are displayed, we can observe OracleReport / FlightStatusInfo events
          truffleAssert.prettyPrintEmittedEvents(result);
        } catch (e) {
          // Enable this when debugging
          // console.log("\nError", idx, oracleIndexes[idx].toNumber(), flight, timestamp);
        }
      }
    }
  });
});
