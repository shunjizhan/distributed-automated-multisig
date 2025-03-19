import minimist from "minimist";

export const SAFE_ADDR = '0xafd20A968DB9E8f60Cb0DDb74fbD0a1fd797D01c';

export const MANAGER_PORT = 1111;
export const VALIDATOR_PORTS = [2222, 3333];

const argv = minimist(process.argv.slice(2));
export const PORT = argv.port || 2222;
export const KEY_INDEX = argv.keyIndex || 1;
