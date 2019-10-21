pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./FlightSuretyStruct.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    mapping(address => bool) private authorizedContracts; // External contracts authorized to make state changes
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false

    mapping(bytes32 => FlightSuretyStruct.Flight) private flights;

    uint8 public airlineCount;
    mapping(address => FlightSuretyStruct.Airline) private airlines;


    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
    (
        address airlineAddress,
        string name
    )
    public
    {
        contractOwner = msg.sender;
        addFirstAirline(airlineAddress, name);
    }

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
        require(operational, "Contract is currently not operational");
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

    modifier isCallerAuthorized()
    {
        require(authorizedContracts[msg.sender] == true, "Caller is not authorized");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */
    function isOperational()
    public
    view
    returns (bool)
    {
        return operational;
    }

    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */
    function setOperatingStatus
    (
        bool mode
    )
    external
    requireContractOwner
    {
        operational = mode;
    }

    function authorizeCaller(address appContract)
    external
    requireContractOwner
    requireIsOperational
    {
        authorizedContracts[appContract] = true;
    }

    function deauthorizeCaller(address appContract)
    external
    requireContractOwner
    requireIsOperational
    {
        authorizedContracts[appContract] = false;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */
    function addAirline
    (
        address airlineAddress,
        string name
    )
    external
    isCallerAuthorized
    {
        FlightSuretyStruct.Airline memory airline = FlightSuretyStruct.Airline(name, false);
        airlines[airlineAddress] = airline;
    }

    function addFirstAirline
    (
        address airlineAddress,
        string name
    )
    private
    {
        // Ensure only first airline get registered
        require(airlineCount == 0, "Can only register the first airline this way");

        FlightSuretyStruct.Airline memory airline = FlightSuretyStruct.Airline(name, false);
        airlines[airlineAddress] = airline;
        airlineCount++;
    }

    function fundAirline(address airlineAddress)
    external
    payable
    isCallerAuthorized
    {
        FlightSuretyStruct.Airline storage airline = airlines[airlineAddress];
        airline.isFunded = true;
    }

    function isAirline(address airlineAddress)
    external
    view
    returns (bool)
    {
        return bytes(airlines[airlineAddress].name).length > 0;
    }

    function isAirlineFunded(address airlineAddress)
    external
    view
    returns (bool)
    {
        return airlines[airlineAddress].isFunded;
    }

    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy
    (
    )
    external
    payable
    isCallerAuthorized
    {

    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
    (
    )
    external
    view
    isCallerAuthorized
    {
    }


    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
    (
    )
    external
    view
    isCallerAuthorized
    {
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund
    (
    )
    public
    payable
    isCallerAuthorized
    {
    }

    function getFlightKey
    (
        address airline,
        string memory flight,
        uint256 timestamp
    )
    pure
    internal
    returns (bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function()
    external
    payable
    isCallerAuthorized
    {
        airlineCount++;
        fund();
    }
}

