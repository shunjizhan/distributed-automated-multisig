import { SafeMultisigTransactionResponse } from '@safe-global/types-kit';
import cors from 'cors';
import express from 'express';

import { KEY_INDEX, PORT, SAFE_ADDR, TON_MULTISIG_ADDR } from '../../consts';
import {
  accounts,
  apiKit,
  confirmTx,
  getPendingOrders,
  getSafeKits,
  getTonWallet,
  MultisigOrder,
  tonClient,
  validateTx,
  validateTonTx
} from '../../utils';
import { toNano } from '@ton/core';

export interface TransactionData {
  to: string;
  value: string;
  data: string;
  operation: number;
}

const app = express();
app.use(express.json());
app.use(cors());

console.log(`Starting signer service with key index ${KEY_INDEX} on port ${PORT}`);
console.log(`Signer address: ${accounts[KEY_INDEX].address} on evm`);

const signingSafeTxs = new Set<string>();
const signingTonTxs = new Set<string>();
const checkAndSignPendingSafeTxs = async (tx: SafeMultisigTransactionResponse) => {
  const { safeTxHash, confirmations } = tx;
  const isAlreadySigned = confirmations?.some(confirmation =>
    confirmation.owner.toLowerCase() === accounts[KEY_INDEX].address.toLowerCase()
  );

  if (isAlreadySigned) {
    return;
  }

  const isValid = await validateTx(safeTxHash);
  if (!isValid) {
    return;
  }

  const safeKits = await getSafeKits();
  const safeKit = safeKits[KEY_INDEX];

  console.log(`Signing transaction ${safeTxHash}...`);
  const sigResponse = await confirmTx(safeKit, safeTxHash);
  console.log(`Transaction ${safeTxHash} signed with signature: ${sigResponse.signature}`);
};

const checkAndSignPendingTonTxs = async (tx: any) => {
  console.log(`Checking and signing transaction ${tx.orderSeqno}...`);
  const { openedWallet, sender } = await getTonWallet();
  const order = new MultisigOrder(tx.orderAddr);
  const openedOrder = tonClient.open(order);
  const data = await openedOrder.getOrderData();
  console.log(data);
  const { signers, approvals, order: orderData } = data;
  const isAlreadySigned = approvals[KEY_INDEX];
  if (isAlreadySigned) {
    return;
  }

  const isValid = await validateTonTx(orderData?.toString() || '');
  if (!isValid) {
    return;
  }

  // send approval
  const signerIdx = signers.findIndex(signer => signer.equals(openedWallet.address));
  if (signerIdx === -1) {
    throw new Error('not a valid signer for this order');
  }

  console.log('sending approval ...')
  await openedOrder.sendApprove(
    sender,
    signerIdx,
    toNano('0.1')
  );

  console.log('approval sent, waiting for confirmation...')
  const maxRetries = 10;
  const retryInterval = 5000;
  for (let i = 0; i < maxRetries; i++) {
    const { approvals } = await openedOrder.getOrderData();
    if (approvals[KEY_INDEX]) {
      console.log('approval confirmed')
      break;
    }

    await new Promise(resolve => setTimeout(resolve, retryInterval));
  }
};

app.get('/info', async (req, res) => {
  try {
    console.log(`Received info request`);
    const address = accounts[KEY_INDEX].address;

    console.log(`Sending signer info: ${address}`);
    res.json({
      success: true,
      signer: {
        index: KEY_INDEX,
        address
      }
    });
  } catch (error) {
    console.error(`Error getting signer info:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get signer info',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

const startPolling = () => {
  console.log(`Starting polling for pending transactions...`);
  const interval = setInterval(async () => {
    if (signingSafeTxs.size > 0) {
      return;
    }

    const pendingSafeTxs = (await apiKit.getPendingTransactions(SAFE_ADDR)).results;
    for (const tx of pendingSafeTxs) {
      if (!signingSafeTxs.has(tx.safeTxHash)) {
        signingSafeTxs.add(tx.safeTxHash);
        await checkAndSignPendingSafeTxs(tx);
        signingSafeTxs.delete(tx.safeTxHash);
      }
    }
  }, 5000);

  const interval2 = setInterval(async () => {
    if (signingTonTxs.size > 0) {
      return;
    }

    const { openedWallet } = await getTonWallet();
    const pendingTonTxs = await getPendingOrders(tonClient, TON_MULTISIG_ADDR, openedWallet.address.toString());
    for (const tx of pendingTonTxs) {
      if (!signingTonTxs.has(tx.orderSeqno.toString())) {
        signingTonTxs.add(tx.orderSeqno.toString());
        await checkAndSignPendingTonTxs(tx);
        signingTonTxs.delete(tx.orderSeqno.toString());
      }
    }
  }, 5000);

  return () => {
    clearInterval(interval);
    clearInterval(interval2);
  };
};

app.listen(PORT, () => {
  console.log(`signer ${KEY_INDEX} service running on http://localhost:${PORT}`);
  startPolling();
});