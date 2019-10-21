const FlightSuretyStruct = artifacts.require("FlightSuretyStruct");
const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require("fs");

const firstAirline = {
    address: "0xf17f52151EbEF6C7334FAD080c5704D77216b732",
    name: "APPLE AIR"
};

module.exports = function(deployer) {
  // manage library
  deployer.deploy(FlightSuretyStruct);
  deployer.link(FlightSuretyStruct, [FlightSuretyData, FlightSuretyApp]);

  deployer.deploy(FlightSuretyData, firstAirline.address, firstAirline.name).then(() => {
    return deployer
      .deploy(FlightSuretyApp, FlightSuretyData.address)
      .then(async () => {
        // Authorize app contract as caller for data contract
        const flightSuretyData = await FlightSuretyData.deployed();
        await flightSuretyData.authorizeCaller(FlightSuretyApp.address);

        // fund first airline
        const flightSuretyApp = await FlightSuretyApp.deployed();
        await flightSuretyApp.fundAirline(firstAirline.address, {
            from: firstAirline.address,
            value: web3.utils.toWei("10", "ether"),
        });

        let config = {
          localhost: {
            url: "http://localhost:8545",
            dataAddress: FlightSuretyData.address,
            appAddress: FlightSuretyApp.address
          }
        };
        fs.writeFileSync(
          __dirname + "/../src/dapp/config.json",
          JSON.stringify(config, null, "\t"),
          "utf-8"
        );
        fs.writeFileSync(
          __dirname + "/../src/server/config.json",
          JSON.stringify(config, null, "\t"),
          "utf-8"
        );
      });
  });
};
