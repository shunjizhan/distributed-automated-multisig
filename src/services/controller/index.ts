import express from 'express';
import cors from 'cors';
import { OperationType } from '@safe-global/types-kit';
import {
  proposeTx,
  execTx,
  apiKit,
  getSafeKits,
  client,
  getPendingOrders,
  createTonOrder,
  jsonParse,
} from '../../utils';
import { MANAGER_PORT, SAFE_ADDR } from '../../consts';

const app = express();
app.use(express.json());
app.use(cors());

// Check if a transaction has enough confirmations and execute it if needed
const checkAndExecuteTx = async (safeTxHash: string) => {
  console.log(`Checking safe transaction ${safeTxHash}...`);

  const safeTransaction = await apiKit.getTransaction(safeTxHash);
  const { confirmationsRequired, confirmations, isExecuted } = safeTransaction;
  const confirmationsCount = confirmations?.length ?? 0;

  console.log(`signatures: ${confirmationsCount}/${confirmationsRequired} `);
  // console.log('Confirmation details:', confirmations);

  if (isExecuted) {
    console.log(`Transaction already executed, skipping execution`);
    return;
  }

  if (confirmationsCount < confirmationsRequired) {
    console.log(`Not enough signatures, waiting for more ...`);
    return;
  }

  console.log(`Executing transaction...`);
  const safeKits = await getSafeKits();
  const execResult = await execTx(safeKits[0], safeTxHash);

  const { hash: txHash } = execResult;
  console.log(`Transaction executed with hash: ${txHash}`);

  console.log('Waiting for confirmation...');
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash as `0x${string}`
    });
  console.log(`Transaction confirmed at block ${receipt.blockNumber}`);
  console.log('')
};

const startPolling = () => {
  console.log('Starting polling for pending transactions...');
  const executingTxs = new Set<string>();
  const interval = setInterval(async () => {
    const pendingTransactions = (await apiKit.getPendingTransactions(SAFE_ADDR)).results;
    for (const { safeTxHash } of pendingTransactions) {
      if (!executingTxs.has(safeTxHash)) {
        executingTxs.add(safeTxHash);
        await checkAndExecuteTx(safeTxHash);
        executingTxs.delete(safeTxHash);
      }
    }
  }, 10 * 1000);

  return () => clearInterval(interval);
};

app.post('/propose', async (req: express.Request, res: express.Response) => {
  try {
    console.log('Received propose request with body:', req.body);
    const { to, value, data = '0x', operation = OperationType.Call } = req.body;

    if (!to || value === undefined) {
      console.log('Missing required parameters in propose request');
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log('Proposing transaction:', { to, value, data, operation });
    const safeKits = await getSafeKits();
    const safeKit = safeKits[0];

    const { safeTxHash } = await proposeTx(safeKit, {
      to,
      value,
      data,
      operation
    });

    console.log(`Transaction proposed successfully with safeTxHash: ${safeTxHash}`);
    res.json({
      success: true,
      safeTxHash,
      message: 'Transaction proposed successfully'
    });
  } catch (error) {
    console.error('Error proposing transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to propose transaction',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post('/create-order', async (req, res) => {
  const { to, value } = req.body;
  const orderData = await createTonOrder({ to, value });

  res.json({
    success: true,
    orderData: jsonParse(orderData)
  });
});

app.get('/status', async (req, res) => {
  console.log('Received status request for all transactions');
  const pendingTransactions = (await apiKit.getPendingTransactions(SAFE_ADDR)).results;
  res.json({
    success: true,
    pendingTransactions
  });
});

app.get('/status/:hash', async (req, res) => {
  const { hash } = req.params;
  console.log(`Received status request for transaction ${hash}`);

  try {
    const safeTransaction = await apiKit.getTransaction(hash);
    res.json({
      success: true,
      safeTransaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction status',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

app.listen(MANAGER_PORT, () => {
  console.log(`Manager service running on http://localhost:${MANAGER_PORT}`);

  startPolling();
});