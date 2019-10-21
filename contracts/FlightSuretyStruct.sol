pragma solidity ^0.4.25;


library FlightSuretyStruct {

    /********************************************************************************************/
    /*                                       SHARED STRUCT                                      */
    /********************************************************************************************/
    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
    }

    struct Airline {
        string name;
        bool isFunded;
    }
}

