pragma solidity ^0.4.25;


library FlightSuretyStruct {

    /********************************************************************************************/
    /*                                       SHARED STRUCT                                      */
    /********************************************************************************************/
    struct Flight {
        string name;
        address airline;
        uint256 timestamp;
        uint8 statusCode;
    }

    struct Airline {
        string name;
        bool isFunded;
    }
}

