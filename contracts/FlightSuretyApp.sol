pragma solidity ^0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects against such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./FlightSuretyStruct.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codes
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    // Airline funding fee
    uint256 private constant AIRLINE_FUNDING_FEE = 10 ether;

    // Max amount a passenger can pay for an insurance
    uint256 private constant INSURANCE_MAX_AMOUNT = 1 ether;

    // Multiparty consensus
    uint8 private MAX_AIRLINES_WITHOUT_CONSENSUS = 4;

    address private contractOwner;              // Account used to deploy contract
    FlightSuretyData private flightSuretyData;  // Data contract
    address private dataContractAddress;       // Data contract address

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational()
    {
        require(flightSuretyData.isOperational(), "Contract is currently not operational");
        _;
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireAirline()
    {
        require(flightSuretyData.isAirline(msg.sender), "Caller is not a funded airline");
        _;
    }

    modifier requireFundedAirline()
    {
        require(flightSuretyData.isAirlineFunded(msg.sender), "Caller is not a funded airline");
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor
    (
        address dataContract
    )
    public
    {
        contractOwner = msg.sender;
        flightSuretyData = FlightSuretyData(dataContract);
        dataContractAddress = dataContract;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational()
    public
    view
    returns (bool)
    {
        return flightSuretyData.isOperational();
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/


    /**
     * @dev Register an airline, using multiparty consensus when necessary
     */
    function registerAirline
    (
        address airlineAddress,
        string name
    )
    external
    requireIsOperational
    requireFundedAirline
    returns (bool success)
    {
        require(flightSuretyData.isAirline(airlineAddress) == false, "Airline already registered");

        uint256 airlineCount = flightSuretyData.airlineCount();
        if (airlineCount < MAX_AIRLINES_WITHOUT_CONSENSUS) {
            flightSuretyData.addAirline(airlineAddress, name);
            success = true;
        } else {
            // Multiparty - Ensure no duplicate votes
            address[] memory votes = flightSuretyData.getAirlineVotes(airlineAddress);
            bool hasDuplicateVotes = false;
            for (uint8 i = 0; i < votes.length; i++) {
                if (votes[i] == msg.sender) {
                    hasDuplicateVotes = true;
                    break;
                }
            }
            require(!hasDuplicateVotes, "Already voted for this airline");

            // Multiparty - Add vote
            flightSuretyData.addAirlineVote(airlineAddress, msg.sender);

            // Multipary - handle consensus
            uint256 totalVotes = votes.length.add(1);
            // previous votes + new vote
            bool hasConsensus = totalVotes.mul(2) >= airlineCount;
            if (hasConsensus) {
                flightSuretyData.addAirline(airlineAddress, name);
                success = true;
            }
        }


        return success;
    }

    function fundAirline(address airlineAddress)
    external
    payable
    requireIsOperational
    requireAirline
    {
        require(flightSuretyData.isAirlineFunded(airlineAddress) == false, "Airline already registered");
        require(msg.value >= AIRLINE_FUNDING_FEE, "At least 10 ethers are required to fund an airline");

        flightSuretyData.fundAirline.value(msg.value)(airlineAddress);
    }

    /**
     * @dev (Passenger) Purchase an insurance
     */
    function purchaseInsurance
    (
        address airline,
        string flight,
        uint256 timestamp
    )
    external
    payable
    requireIsOperational
    {
        require(msg.value > 0, "Purchase amount cannot be 0");
        require(msg.value <= INSURANCE_MAX_AMOUNT, "1 ether is the maximum for purchasing insurance");

        flightSuretyData.purchaseInsurance.value(msg.value)(msg.sender, airline, flight, timestamp);
    }

    /**
     * @dev Called after oracle has updated flight status
     *
     */
    function processFlightStatus
    (
        address airline,
        string flight,
        uint256 timestamp,
        uint8 statusCode
    )
    internal
    requireIsOperational
    {
        if (statusCode == STATUS_CODE_LATE_AIRLINE) {
            flightSuretyData.creditInsurees(airline, flight, timestamp);
        }
    }

    /**
     * @dev Admin function to manually process flight status as contract owner
     */
    function processFlightStatusAsOwner
    (
        address airline,
        string flight,
        uint256 timestamp,
        uint8 statusCode
    )
    external
    requireIsOperational
    requireContractOwner
    {
        processFlightStatus(airline, flight, timestamp, statusCode);
    }

    function pay
    (
        address passenger
    )
    external
    requireIsOperational
    {
        require(msg.sender == passenger, "Only the passenger can request a withdrawal");

        flightSuretyData.pay(passenger);
    }

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
    (
        address airline,
        string flight,
        uint256 timestamp
    )
    external
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
            requester : msg.sender,
            isOpen : true
            });

        emit OracleRequest(index, airline, flight, timestamp);
    }


    // region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);


    // Register an oracle with the contract
    function registerOracle
    (
    )
    external
    payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
            isRegistered : true,
            indexes : indexes
            });
    }

    function getMyIndexes
    (
    )
    view
    external
    returns (uint8[3])
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }




    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
    (
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp,
        uint8 statusCode
    )
    external
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {
            // delete oracle response to avoid processing further responses
            delete oracleResponses[key];

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
    (
        address account
    )
    internal
    returns (uint8[3])
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
    (
        address account
    )
    internal
    returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;
            // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    // endregion

}

contract FlightSuretyData {
    function isOperational()
    external view returns (bool);

    function addAirline(address airlineAddress, string name)
    external;

    function fundAirline(address airlineAddress)
    external payable;

    function isAirline(address airlineAddress)
    external view returns (bool);

    function isAirlineFunded(address airlineAddress)
    external view returns (bool);

    function airlineCount()
    public returns (uint256);

    function getAirlineVotes(address airlineAddress)
    external view returns (address[]);

    function addAirlineVote(address airlineAddress, address votingAddress)
    external;

    function purchaseInsurance(address passenger, address airline, string flight, uint256 timestamp)
    external payable;

    function creditInsurees(address airline, string flight, uint256 timestamp)
    external;

    function pay(address passenger)
    external;
}
