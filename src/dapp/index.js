import DOM from "./dom";
import Contract from "./contract";
import "./flightsurety.css";

const STATUS = {
  0: "UNKNOWN",
  10: "ON_TIME",
  20: "LATE_AIRLINE",
  30: "LATE_WEATHER",
  40: "LATE_TECHNICAL",
  50: "LATE_OTHER"
};

let sectionCount = 0;
const sectionByFlights = {};
const getFlightKey = (airline, flight, timestamp) => [airline, flight, timestamp].join("|");
const airlineNames = [
  "Apple Airline",
  "Banana Airline",
  "Cherry Airline",
  "Dragon Fruit Airline",
  "Elderberry Airline"
];

const flightNames = ["CDG -> JFK", "CDG -> PEK", "CDG -> SYD", "CDG -> CGK", "CDG -> GIG"];

const getFlightInfo = (airlines, flightIndex) => {
  return {
    airline: airlines[flightIndex]
  };
};

(async () => {
  let result = null;

  let contract = new Contract("localhost", () => {
    // Process and store flight infos
    contract.flightInfos = contract.airlines.reduce((acc, airline, index) => {
      const info = {
        airline,
        airlineName: airlineNames[index],
        flight: flightNames[index],
        timestamp: Math.floor(Date.now() / 1000)
      };
      acc[airline] = info;
      return acc;
    }, {});

    // Read transaction
    contract.isOperational((error, result) => {
      display("Operational Status", "Check if contract is operational", [
        { label: "Operational Status", error: error, value: result }
      ]);
    });

    // User-submitted transaction
    DOM.elid("submit-oracle").addEventListener("click", () => {
      const flightIndex = DOM.elid("flight-index").value;
      const airline = contract.airlines[flightIndex];
      const flightInfo = contract.flightInfos[airline];

      // Write transaction
      contract.fetchFlightStatus(flightInfo, (error, flightInfo) => {
        const flightKey = getFlightKey(flightInfo.airline, flightInfo.flight, flightInfo.timestamp);
        sectionByFlights[flightKey] = sectionCount;

        display("Oracles", "Trigger oracles", [
          {
            label: "Fetch Flight Status",
            error: error,
            value: [flightInfo.airlineName, flightInfo.flight, flightInfo.timestamp].join(" ")
          }
        ]);
      });
    });

    DOM.elid("purchase-insurance").addEventListener("click", () => {
      const amount = DOM.elid("insurance").value;
      const flightIndex = DOM.elid("flight-index").value;
      const airline = contract.airlines[flightIndex];
      const flightInfo = contract.flightInfos[airline];

      // Write transaction
      contract.purchaseInsurance(flightInfo, amount, (error, flightInfo, amount) => {
        const flightKey = getFlightKey(flightInfo.airline, flightInfo.flight, flightInfo.timestamp);
        sectionByFlights[flightKey] = sectionCount;

        display(
          "Passenger",
          "Insurance purchased",
          [
            {
              label: "Flight Info",
              error: error,
              value: [flightInfo.airlineName, flightInfo.flight, flightInfo.timestamp].join(" ")
            }
          ],
          [
            {
              label: "Amount",
              value: amount
            }
          ]
        );
      });
    });

    // regurlarly refresh InsurancePurchaseAmount and PassengerBalance
    const refresh = async () => {
      const flightIndex = DOM.elid("flight-index").value;
      const airline = contract.airlines[flightIndex];
      const currentFlight = contract.flightInfos[airline];

      const currentFlightLabel = [currentFlight.airlineName, currentFlight.flight, currentFlight.timestamp].join(" ");
      const insuranceAmount = contract.web3.utils.fromWei(await contract.getInsurancePurchaseAmount(currentFlight));
      const passengerBalance = contract.web3.utils.fromWei(await contract.getPassengerBalance());

      actualizeRefreshedInfo(currentFlightLabel, insuranceAmount, passengerBalance);

      setTimeout(refresh, 1000);
    };
    refresh();
  });

  contract.onFlightStatusInfo = event => {
    const { airline, flight, timestamp, status } = event.returnValues;
    const statusLabel = STATUS[status] || STATUS[0];
    const flightKey = getFlightKey(airline, flight, timestamp);
    const sectionIndex = sectionByFlights[flightKey];
    displayFlightStatusInfo(status, statusLabel, sectionIndex);
  };
})();

function display(title, description, results) {
  let displayDiv = DOM.elid("display-wrapper");
  let section = DOM.section({ id: `section-${sectionCount}` });
  sectionCount++;
  section.appendChild(DOM.h2(title));
  section.appendChild(DOM.h5(description));
  results.map(result => {
    let row = section.appendChild(DOM.div({ className: "row" }));
    row.appendChild(DOM.div({ className: "col-sm-4 field" }, result.label));
    row.appendChild(
      DOM.div({ className: "col-sm-8 field-value" }, result.error ? String(result.error) : String(result.value))
    );
    section.appendChild(row);
  });
  displayDiv.append(section);
}

function displayFlightStatusInfo(status, statusLabel, sectionIndex) {
  const section = DOM.elid(`section-${sectionIndex}`);
  if (!section) return;
  const row = section.appendChild(DOM.div({ className: "row" }));
  row.appendChild(DOM.div({ className: "col-sm-4 field" }, "Flight Status Info"));
  row.appendChild(DOM.div({ className: "col-sm-8 field-value" }, `${statusLabel} (${status})`));
  section.appendChild(row);
}

function actualizeRefreshedInfo(currentFlightLabel, insuranceAmount, passengerBalance) {
  DOM.elid("selected-flight").textContent = currentFlightLabel;
  DOM.elid("insurance-amount").textContent = insuranceAmount;
  DOM.elid("passenger-balance").textContent = passengerBalance;
}
