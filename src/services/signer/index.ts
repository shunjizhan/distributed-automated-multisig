import { SafeMultisigTransactionResponse } from '@safe-global/types-kit';
import cors from 'cors';
import express from 'express';

import { KEY_INDEX, PORT, SAFE_ADDR } from '../../consts';
import {
  accounts,
  apiKit,
  confirmTx,
  getSafeKits,
  validateTx
} from '../../utils';

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

const signingTxs = new Set<string>();
const checkAndSignPendingTxs = async (tx: SafeMultisigTransactionResponse) => {
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
    const pendingTxs = (await apiKit.getPendingTransactions(SAFE_ADDR)).results;
    for (const tx of pendingTxs) {
      if (!signingTxs.has(tx.safeTxHash)) {
        signingTxs.add(tx.safeTxHash);
        await checkAndSignPendingTxs(tx);
        signingTxs.delete(tx.safeTxHash);
      }
    }
  }, 5000);
  return () => clearInterval(interval);
};

app.listen(PORT, () => {
  console.log(`signer ${KEY_INDEX} service running on http://localhost:${PORT}`);
  startPolling();
});