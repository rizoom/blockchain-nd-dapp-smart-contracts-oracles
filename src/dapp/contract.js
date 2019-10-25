import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import FlightSuretyData from "../../build/contracts/FlightSuretyData.json";
import Config from "./config.json";
import Web3 from "web3";

const GAS_LIMIT = 4500000;

export default class Contract {
  constructor(network, callback) {
    let config = Config[network];
    this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace("http", "ws")));
    this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
    this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
    this.initialize(callback);
    this.owner = null;
    this.airlines = [];
  }

  initialize(callback) {
    this.web3.eth.getAccounts((error, accts) => {
      this.owner = accts[0];
      this.passenger = accts[10];

      let counter = 1;
      while (this.airlines.length < 5) {
        this.airlines.push(accts[counter++]);
      }

      // watch FlightStatusInfo
      this.flightSuretyApp.events.FlightStatusInfo(
        {
          fromBlock: 0
        },
        (error, event) => {
          if (error) console.error(error);
          if (this.onFlightStatusInfo) {
            this.onFlightStatusInfo(event);
          }
        }
      );

      callback();
    });
  }

  isOperational(callback) {
    this.flightSuretyApp.methods.isOperational().call({ from: this.owner }, callback);
  }

  fetchFlightStatus(flightInfo, callback) {
    this.flightSuretyApp.methods
      .fetchFlightStatus(flightInfo.airline, flightInfo.flight, flightInfo.timestamp)
      .send({ from: this.owner }, (error, result) => {
        callback(error, flightInfo);
      });
  }

  purchaseInsurance(flightInfo, amount, callback) {
    this.flightSuretyApp.methods
      .purchaseInsurance(flightInfo.airline, flightInfo.flight, flightInfo.timestamp)
      .send({ from: this.passenger, value: this.web3.utils.toWei(amount, "ether"), gas: GAS_LIMIT }, (error, result) => {
        callback(error, flightInfo, amount);
      });
  }

  getInsurancePurchaseAmount(flightInfo) {
    return this.flightSuretyData.methods
      .getInsurancePurchaseAmount(this.passenger, flightInfo.airline, flightInfo.flight, flightInfo.timestamp)
      .call({ from: this.owner });
  }

  getPassengerBalance() {
    return this.flightSuretyData.methods
        .getPassengerBalance(this.passenger)
        .call({ from: this.owner });
  }
}

