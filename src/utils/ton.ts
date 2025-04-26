import { Address, TonClient, WalletContractV4, beginCell, internal as internal_relaxed, toNano } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import dotenv from 'dotenv';

import { KEY_INDEX, TON_MULTISIG_ADDR } from "../consts";
import { Multisig, MultisigOrder } from "./wrappers";
import { runWithRetry } from "./runner";

dotenv.config();

const apiKey = process.env.TON_CENTER_API_KEY;
if (!apiKey) {
  throw new Error('TON_CENTER_API_KEY is not set');
}

export const tonClient = new TonClient({
  endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
  apiKey,
  // httpAdapter,
});

export const getTonWallet = async () => {
  const mnemonics = process.env[`TON_MNEMONIC_${KEY_INDEX}`];
  if (!mnemonics) {
    throw new Error(`TON_MNEMONIC_${KEY_INDEX} is not set`);
  }
  const keyPair = await mnemonicToPrivateKey(mnemonics.split(' '));
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  const openedWallet = tonClient.open(wallet);
  const sender = openedWallet.sender(keyPair.secretKey);

  return { wallet, openedWallet, sender };
}

export const createTonOrder = async (data: any) => {
  const { wallet, sender } = await getTonWallet();
  const multisig = tonClient.open(new Multisig(Address.parse(TON_MULTISIG_ADDR)));

  const { value, to } = data;
  if (value === undefined || to === undefined) {
    throw new Error('value and to are required for the order');
  }

  const actionMsg = {         // the actual action to be executed, send 0.00123 TON to a random address
    type: "transfer" as const,
    sendMode: 1,            // sender pays fees
    message: internal_relaxed({
      to,
      value,
      body: beginCell().storeUint(0, 32).endCell()
    })
  };

  const { nextOrderSeqno } = await multisig.getMultisigData();
  const orderAddr = await multisig.getOrderAddress(nextOrderSeqno);

  console.log({ signerAddr: wallet.address?.toString() })
  console.log(`sending new order with seqno ${nextOrderSeqno}...`)
  const validUntil = Math.floor(Date.now() / 1000 + 3600);
  await runWithRetry(() => multisig.sendNewOrder(
      sender,
      [actionMsg],
      validUntil,
      toNano('0.03'),
      0,
      true
  ));

  console.log('waiting for order to be confirmed... ')
  const order = tonClient.open(new MultisigOrder(orderAddr));

  const maxRetries = 30;
  const retryInterval = 5000;
  let orderData;
  for (let i = 0; i < maxRetries; i++) {
    orderData = await runWithRetry(() => order.getOrderData());
    // console.log(orderData);
    if (orderData.inited) {
      console.log('order confirmed')
      break;
    }

    await new Promise(resolve => setTimeout(resolve, retryInterval));
  }

  console.log('waiting for order to be executed...')
  for (let i = 0; i < maxRetries; i++) {
    orderData = await runWithRetry(() => order.getOrderData());
    console.log(`current approvals: ${orderData.approvals.filter(x => x).length}/${orderData.threshold}`)
    if (orderData.executed) {
      console.log('order executed!')
      break;
    }

    await new Promise(resolve => setTimeout(resolve, retryInterval));
  }

  return orderData;
}