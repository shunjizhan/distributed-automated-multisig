import { TonClient, WalletContractV4 } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";

import { KEY_INDEX } from "../consts";

export const tonClient = new TonClient({
  endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
});

export const getTonWallet = async () => {
  const mnemonics = process.env[`TON_MNEMONIC_${KEY_INDEX}`];
  if (!mnemonics) {
    throw new Error(`TON_MNEMONIC_${KEY_INDEX} is not set`);
  }
  const keyPair = await mnemonicToPrivateKey(mnemonics.split(' '));
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  const openedWallet = tonClient.open(wallet);
  return { wallet, openedWallet };
}
