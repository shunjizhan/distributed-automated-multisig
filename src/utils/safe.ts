import Safe from '@safe-global/protocol-kit'
import { MetaTransactionData } from '@safe-global/types-kit';
import SafeApiKit from '@safe-global/api-kit';
import assert from 'assert';
import { sepolia } from 'viem/chains';

import { SAFE_ADDR } from '../consts';

export const apiKit = new SafeApiKit({
  chainId: 11155111n
})

export const getSafeKits = async (privateKeys: string[]) => {
  return await Promise.all(privateKeys.map(key => Safe.init({
    provider: sepolia.rpcUrls.default.http[0],
    signer: key,
    safeAddress: SAFE_ADDR,
  })))
}

export const proposeTx = async (safeKit: Safe, tx: MetaTransactionData) => {
  const safeTransaction = await safeKit.createTransaction({
    transactions: [tx]
  })

  console.log({ safeTransaction })

  // Deterministic hash based on transaction parameters
  const safeTxHash = await safeKit.getTransactionHash(safeTransaction)

  // Sign transaction to verify that the transaction is coming from this sender
  const senderSignature = await safeKit.signHash(safeTxHash)

  await apiKit.proposeTransaction({
    safeAddress: SAFE_ADDR,
    safeTransactionData: safeTransaction.data,
    safeTxHash,
    senderAddress: senderSignature.signer,
    senderSignature: senderSignature.data
  })
}

export const execTx = async (safeKit: Safe, safeTxHash: string) => {
  const safeTransaction = await apiKit.getTransaction(safeTxHash);
  const { confirmationsRequired, confirmations } = safeTransaction;
  const confirmationsCount = confirmations?.length ?? 0;
  assert(confirmationsCount >= confirmationsRequired, `Not enough confirmations: ${confirmationsCount} < ${confirmationsRequired}`);

  console.log(`confirmations: ${confirmationsCount} >= ${confirmationsRequired}, executing transaction...`)

  const executeTxResponse = await safeKit.executeTransaction(safeTransaction);
  return executeTxResponse;
}

export const confirmTx = async (safeKit: Safe, safeTxHash: string) => {
  const sig = await safeKit.signHash(safeTxHash)

  const sigResponse = await apiKit.confirmTransaction(
    safeTxHash,
    sig.data
  )

  return sigResponse;
}