import minimist from "minimist";

export const SAFE_ADDR = '0xafd20A968DB9E8f60Cb0DDb74fbD0a1fd797D01c';
export const TON_MULTISIG_ADDR = 'EQAUl8PtV2S19JKAHTShzgJP2jnsVx0-gNobZ-I3zEp6lPQ6';

export const MANAGER_PORT = 1111;
export const VALIDATOR_PORTS = [2222, 3333];

const argv = minimist(process.argv.slice(2));
export const PORT = argv.port;
export const KEY_INDEX = argv.keyIndex;

if (PORT === undefined || KEY_INDEX === undefined) {
  throw new Error('PORT and KEY_INDEX are required');
}

console.log({ PORT, KEY_INDEX });
