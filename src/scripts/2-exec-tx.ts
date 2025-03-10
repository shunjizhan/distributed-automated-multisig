import dotenv from 'dotenv';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { http, publicActions, createWalletClient } from 'viem';
import Safe from '@safe-global/protocol-kit'
import { MetaTransactionData } from '@safe-global/types-kit';
import { OperationType } from '@safe-global/types-kit';
import SafeApiKit from '@safe-global/api-kit';
import assert from 'assert';

dotenv.config();
const SAFE_ADDR = '0x47DB4f6145A25f2253BAd30A351A8eB775Df44D9';

const apiKit = new SafeApiKit({
  chainId: 11155111n
})

const proposeTx = async (safeKit: Safe, tx: MetaTransactionData) => {
  const safeTransaction = await safeKit.createTransaction({
    transactions: [tx]
  })

  console.log({ safeTransaction })

  // Deterministic hash based on transaction parameters
  const safeTxHash = await safeKit.getTransactionHash(safeTransaction)

  // Sign transaction to verify that the transaction is coming from this sender
  const senderSignature = await safeKit.signHash(safeTxHash)
  console.log({ sender: senderSignature.signer })

  await apiKit.proposeTransaction({
    safeAddress: SAFE_ADDR,
    safeTransactionData: safeTransaction.data,
    safeTxHash,
    senderAddress: senderSignature.signer,
    senderSignature: senderSignature.data
  })
}

const execTx = async (safeKit: Safe, safeTxHash: string) => {
  const safeTransaction = await apiKit.getTransaction(safeTxHash);
  const { confirmationsRequired, confirmations } = safeTransaction;
  const confirmationsCount = confirmations?.length ?? 0;
  assert(confirmationsCount >= confirmationsRequired, `Not enough confirmations: ${confirmationsCount} < ${confirmationsRequired}`);

  console.log(`confirmations: ${confirmationsCount} >= ${confirmationsRequired}, executing transaction...`)

  const executeTxResponse = await safeKit.executeTransaction(safeTransaction);
  return executeTxResponse;
}

async function main() {
  const privateKeys = process.env.KEYS?.split(',') || [];
  if (privateKeys.length !== 3) {
    throw new Error('Expected 3 private keys in the KEYS environment variable');
  }

  const [account1, account2, account3] = privateKeys.map(key => privateKeyToAccount(`0x${key}`));

  const client = createWalletClient({
    chain: sepolia,
    transport: http(),
    account: account1,
  }).extend(publicActions);

  const protocolKitOwner1 = await Safe.init({
    provider: sepolia.rpcUrls.default.http[0],
    signer: privateKeys[0],
    safeAddress: SAFE_ADDR,
  });

  const protocolKitOwner2 = await Safe.init({
    provider: sepolia.rpcUrls.default.http[0],
    signer: privateKeys[1],
    safeAddress: SAFE_ADDR
  })

  const isSafeDeployed = await protocolKitOwner1.isSafeDeployed() // True
  const safeAddress = await protocolKitOwner1.getAddress()
  const safeOwners = await protocolKitOwner1.getOwners()
  const safeThreshold = await protocolKitOwner1.getThreshold()

  console.log({
    safeAddress,
    isSafeDeployed,
    safeOwners,
    safeThreshold
  })

  const safeTransactionData: MetaTransactionData = {
    to: account1.address,
    value: '1', // 1 wei
    data: '0x',
    operation: OperationType.Call
  }

  await proposeTx(protocolKitOwner1, safeTransactionData)

  const pendingTransactions = (await apiKit.getPendingTransactions(SAFE_ADDR)).results
  const pendingHashes = pendingTransactions.map(tx => tx.safeTxHash)
  console.log({ pendingHashes })

  const pendingHash = pendingHashes[0];
  assert(pendingHash, 'No pending hash found')

  const signature2 = await protocolKitOwner2.signHash(pendingHash)

  // Confirm the Safe transaction
  const signatureResponse = await apiKit.confirmTransaction(
    pendingHash,
    signature2.data
  )

  console.log({ signatureResponse })

  const execResult = await execTx(protocolKitOwner1, pendingHash)
  const { hash: txHash } = execResult;
  console.log({ txHash })

  console.log('waiting for confirmation...')
  const receipt = await client.waitForTransactionReceipt({ hash: txHash as `0x${string}`, retryCount: 999 })
  console.log({ receipt })
}

main().catch(console.error);