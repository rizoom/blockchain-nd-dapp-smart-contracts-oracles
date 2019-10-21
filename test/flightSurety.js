var Test = require("../config/testConfig.js");
var BigNumber = require("bignumber.js");

contract("Flight Surety Tests", async accounts => {
  var config;
  before("setup contract", async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(
      config.flightSuretyApp.address
    );
    await config.flightSuretyApp.fundAirline(config.firstAirline.address, {
      from: config.firstAirline.address,
      value: web3.utils.toWei("10", "ether")
    });
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function() {
    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");
  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function() {
    // Ensure that access is denied for non-Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false, {
        from: config.testAddresses[2]
      });
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function() {
    // Ensure that access is allowed for Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false);
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(
      accessDenied,
      false,
      "Access not restricted to Contract Owner"
    );

    // Set it back for other tests to work
    await config.flightSuretyData.setOperatingStatus(true);
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function() {
    let newAirline = accounts[2];
    await config.flightSuretyData.setOperatingStatus(false);

    let reverted = false;
    try {
      await config.flightSuretyApp.registerAirline(
        newAirline,
        "Alpha Test Airline",
        {
          from: config.firstAirline.address
        }
      );
    } catch (e) {
      reverted = true;
    }
    assert.equal(reverted, true, "Access not blocked for requireIsOperational");

    // Set it back for other tests to work
    await config.flightSuretyData.setOperatingStatus(true);
  });

  it("(airline) can register an Airline using registerAirline() with a funded airline", async () => {
    let newAirline = accounts[2];

    await config.flightSuretyApp.registerAirline(
      newAirline,
      "2nd Test Airline",
      {
        from: config.firstAirline.address
      }
    );

    const isAirline = await config.flightSuretyData.isAirline.call(newAirline);
    const isAirlineFunded = await config.flightSuretyData.isAirlineFunded.call(
      newAirline
    );
    assert.equal(isAirline, true, "Airline wasn't registered");
    assert.equal(isAirlineFunded, false, "Airline shouldn't be funded");

    // Set it back for other tests to work
    await config.flightSuretyData.setOperatingStatus(true);
  });

  it("(airline) cannot register an Airline using registerAirline() if it is not funded", async () => {
    // ARRANGE
    const unfundedAirline = accounts[2];
    const newAirline = accounts[3];

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(
        newAirline,
        "3rd Test Airline",
        {
          from: unfundedAirline
        }
      );
    } catch (e) {}

    let isAirline = await config.flightSuretyData.isAirline.call(newAirline);

    // ASSERT
    assert.equal(
      isAirline,
      false,
      "Airline should not be able to register another airline if it hasn't provided funding"
    );
  });
});
