# Distributed Automated Multisig System on TON and EVM

Automate transactions with multisig, not hot wallet!

Works with Ton [multisig-v2](https://github.com/ton-blockchain/multisig-contract-v2) on TON chain, and [safe wallet](https://safe.global/wallet) on EVM chains.

## run
- put private keys for EVM accounts and mnemonics for TON accounts in `.env` file
- start controller with `yarn start:controller`
- start signer with `yarn start:signer1` and `yarn start:signer2`
