# FlightSurety

FlightSurety is a sample application project for Udacity's Blockchain course.

## Notes

- truffle version: 4.1.6
- node version: 8.9.4

The first airline is automatically registered and funded during contract deployment, as well as app contract being authorized by data contract (2_deploy_contracts.js)
  
Project has been developed and tested with `Ganache CLI v1.2.2` on port number `8545` with the following parameters:
- Account default balance : 1000
- Total account to generate : 100

Accounts are used the same way in all parts of the project (tests, dapp, oracle server) :
- Account 0 is the contract owners, used to deploy contracts
- Accounts 1 to 9 are reserved for airlines
- Accounts 10 to 19 are reserved for passengers
- Accounts 20 to 99 are reserved for oracles

When running the oracle server, 60 oracles are automatically registered. It can take a while, be sure to wait until all oracles are registered with their indexes.  
Logs will explicitly indicates when registration is finished.

## Install

This repository contains Smart Contract code in Solidity (using Truffle), tests (also using Truffle), dApp scaffolding (using HTML, CSS and JS) and server app scaffolding.

To install, download or clone the repo, then:

`npm install`
`truffle compile`

## Develop Client

To run truffle tests:

`truffle test ./test/flightSurety.js`
`truffle test ./test/oracles.js`

To use the dapp:

`truffle migrate`
`npm run dapp`

To view dapp:

`http://localhost:8000`

## Develop Server

`npm run server`
`truffle test ./test/oracles.js`

## Deploy

To build dapp for prod:
`npm run dapp:prod`

Deploy the contents of the ./dapp folder

## Resources

- [How does Ethereum work anyway?](https://medium.com/@preethikasireddy/how-does-ethereum-work-anyway-22d1df506369)
- [BIP39 Mnemonic Generator](https://iancoleman.io/bip39/)
- [Truffle Framework](http://truffleframework.com/)
- [Ganache Local Blockchain](http://truffleframework.com/ganache/)
- [Remix Solidity IDE](https://remix.ethereum.org/)
- [Solidity Language Reference](http://solidity.readthedocs.io/en/v0.4.24/)
- [Ethereum Blockchain Explorer](https://etherscan.io/)
- [Web3Js Reference](https://github.com/ethereum/wiki/wiki/JavaScript-API)
