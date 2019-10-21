var Test = require("../config/testConfig.js");
var BigNumber = require("bignumber.js");

contract("Flight Surety Tests", async accounts => {
  var config;
  before("setup contract", async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
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
    assert.equal(accessDenied, false, "Access not restricted to Contract Owner");

    // Set it back for other tests to work
    await config.flightSuretyData.setOperatingStatus(true);
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function() {
    let newAirline = accounts[2];
    await config.flightSuretyData.setOperatingStatus(false);

    let reverted = false;
    try {
      await config.flightSuretyApp.registerAirline(newAirline, "2nd Test Airline", {
        from: config.firstAirline.address
      });
    } catch (e) {
      reverted = true;
    }
    assert.equal(reverted, true, "Access not blocked for requireIsOperational");

    // Set it back for other tests to work
    await config.flightSuretyData.setOperatingStatus(true);
  });

  it("(airline) can register an Airline using registerAirline() with a funded airline", async () => {
    let newAirline = accounts[2];

    await config.flightSuretyApp.registerAirline(newAirline, "2nd Test Airline", {
      from: config.firstAirline.address
    });

    const isAirline = await config.flightSuretyData.isAirline.call(newAirline);
    const isAirlineFunded = await config.flightSuretyData.isAirlineFunded.call(newAirline);

    assert.equal(isAirline, true, "Airline wasn't registered");
    assert.equal(isAirlineFunded, false, "Airline shouldn't be funded");
  });

  it("(airline) cannot register an Airline using registerAirline() if it is not an airline", async () => {
    // ARRANGE
    const notAnAirline = config.testAddresses[2];
    const newAirline = accounts[3];

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(newAirline, "3rd Test Airline", {
        from: notAnAirline
      });
    } catch (e) {}

    let isAirline = await config.flightSuretyData.isAirline.call(newAirline);

    // ASSERT
    assert.equal(isAirline, false, "Only airline can register another airline");
  });

  it("(airline) cannot register an Airline using registerAirline() if it is not funded", async () => {
    // ARRANGE
    const unfundedAirline = accounts[2];
    const newAirline = accounts[3];

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(newAirline, "3rd Test Airline", {
        from: unfundedAirline
      });
    } catch (e) {}

    let isAirline = await config.flightSuretyData.isAirline.call(newAirline);

    // ASSERT
    assert.equal(
      isAirline,
      false,
      "Airline should not be able to register another airline if it hasn't provided funding"
    );
  });

  it("(airline) registered Airline can be funded with at least 10 ethers", async () => {
    // ARRANGE
    const unfundedAirline = accounts[2];

    // ACT
    try {
      await config.flightSuretyApp.fundAirline(unfundedAirline, {
        from: unfundedAirline,
        value: web3.utils.toWei("10", "ether").minus(1) // 10 ethers minus 1 wei.
      });
    } catch (e) {}

    // ASSERT
    let isFunded = await config.flightSuretyData.isAirlineFunded.call(unfundedAirline);
    assert.equal(isFunded, false, "At least 10 ethers must be sent for airline funding.");

    // ACT AGAIN
    await config.flightSuretyApp.fundAirline(unfundedAirline, {
      from: unfundedAirline,
      value: web3.utils.toWei("10", "ether") // 10 ethers this time
    });

    // ASSERT
    isFunded = await config.flightSuretyData.isAirlineFunded.call(unfundedAirline);
    assert.equal(isFunded, true, "Airline wasn't funded.");
  });

  it("(airline) No multi-party consensus needed until for airlines are registered", async () => {
    // ARRANGE
    const newAirline1 = accounts[3];
    const newAirline2 = accounts[4];

    // ACT
    await config.flightSuretyApp.registerAirline(newAirline1, "3rd Test Airline", {
      from: config.firstAirline.address
    });
    await config.flightSuretyApp.fundAirline(newAirline1, {
      from: newAirline1,
      value: web3.utils.toWei("10", "ether") // 10 ethers this time
    });

    await config.flightSuretyApp.registerAirline(newAirline2, "4th Test Airline", {
      from: config.firstAirline.address
    });
    await config.flightSuretyApp.fundAirline(newAirline2, {
      from: newAirline2,
      value: web3.utils.toWei("10", "ether") // 10 ethers this time
    });

    // ASSERT
    const isAirline1 = await config.flightSuretyData.isAirlineFunded.call(newAirline1);
    const isAirline2 = await config.flightSuretyData.isAirlineFunded.call(newAirline2);
    const airlineCount = await config.flightSuretyData.airlineCount.call();
    assert.equal(isAirline1, true, "Airline 1 not registered");
    assert.equal(isAirline2, true, "Airline 2 not registered");
    assert.equal(airlineCount, 4, "Expected 4 airlines to be registered at that point");
  });

  it("(airline) Registration of fifth airline requires multi-party consensus of 50% of registered airlines", async () => {
    // ARRANGE
    const newAirline = accounts[5];

    // ACT
    await config.flightSuretyApp.registerAirline(newAirline, "5th Test Airline", {
      from: config.firstAirline.address
    });

    // ASSERT
    let isAirline = await config.flightSuretyData.isAirline.call(newAirline);
    let votes = await config.flightSuretyData.getAirlineVotes.call(newAirline);
    assert.equal(isAirline, false, "Airline shouldn't be registered yet");
    assert.equal(votes.length, 1, "Expected 1 vote");
    assert.equal(votes[0], config.firstAirline.address, "First vote should be first airline address");

    // ACT - other votes
    await config.flightSuretyApp.registerAirline(newAirline, "5th Test Airline", {
      from: accounts[2]
    });

    // ASSERT
    isAirline = await config.flightSuretyData.isAirline.call(newAirline);
    votes = await config.flightSuretyData.getAirlineVotes.call(newAirline);
    const airlineCount = await config.flightSuretyData.airlineCount.call();
    assert.equal(isAirline, true, "Airline not registered");
    assert.equal(votes.length, 2, "Expected 2 votes");
    assert.equal(votes[1], accounts[2], "First vote should be first airline address");
    assert.equal(airlineCount, 5, "Expected 5 airlines to be registered at that point");
  });

  it("(airline) Registration of sixth airline requires multi-party consensus of 50% of registered airlines", async () => {
    // ARRANGE
    const newAirline = accounts[6];

    // ACT
    await config.flightSuretyApp.registerAirline(newAirline, "6th Test Airline", {
      from: config.firstAirline.address
    });
    await config.flightSuretyApp.registerAirline(newAirline, "6th Test Airline", {
      from: accounts[2]
    });
    await config.flightSuretyApp.registerAirline(newAirline, "6th Test Airline", {
      from: accounts[3]
    });

    // ASSERT
    let isAirline = await config.flightSuretyData.isAirline.call(newAirline);
    let votes = await config.flightSuretyData.getAirlineVotes.call(newAirline);
    const airlineCount = await config.flightSuretyData.airlineCount.call();
    assert.equal(isAirline, true, "Airline not registered");
    assert.equal(votes.length, 3, "Expected 3 votes");
    assert.equal(airlineCount, 6, "Expected 6 airlines to be registered at that point");
  });
});
