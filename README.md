# Distributed Automated Multisig System on TON and EVM

Automate transactions with multisig, not hot wallet!

Works with Ton [multisig-v2](https://github.com/ton-blockchain/multisig-contract-v2) on TON chain, and [safe wallet](https://safe.global/wallet) on EVM chains.

## run services
- put private keys for EVM accounts and mnemonics for TON accounts in `.env` file
- start controller with `yarn start:controller`
- start signer with `yarn start:signer1` and `yarn start:signer2`

## send tx
tx construction is not coupled with the automated and distributed signing process, so it can be fully automated by the service. 

For POC purpose, we can manually trigger a transaction on the controller:
- POST `/create-order` to create a transaction on TON testnet
- POST `/propose` to create a transaction on EVM
