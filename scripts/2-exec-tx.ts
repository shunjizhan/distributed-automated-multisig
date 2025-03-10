import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { http, publicActions, createWalletClient } from 'viem';
import Safe from '@safe-global/protocol-kit'
import { MetaTransactionData } from '@safe-global/types-kit';
import { OperationType } from '@safe-global/types-kit';
import assert from 'assert';

import { apiKit, proposeTx, execTx, privateKeys, accounts, client, getSafeKits, confirmTx } from '../src/utils';
import { SAFE_ADDR } from '../src/consts';

async function main() {
  const [safe0, safe1, safe2] = await getSafeKits(privateKeys);

  const isSafeDeployed = await safe0.isSafeDeployed()
  const safeAddress = await safe0.getAddress()
  const safeOwners = await safe0.getOwners()
  const safeThreshold = await safe0.getThreshold()

  console.log({
    safeAddress,
    isSafeDeployed,
    safeOwners,
    safeThreshold
  })

  const safeTransactionData: MetaTransactionData = {
    to: accounts[0].address,
    value: '1',
    data: '0x',
    operation: OperationType.Call
  }

  await proposeTx(safe0, safeTransactionData)

  const pendingTransactions = (await apiKit.getPendingTransactions(SAFE_ADDR)).results
  const pendingHashes = pendingTransactions.map(tx => tx.safeTxHash)

  const pendingHash = pendingHashes[0];
  assert(pendingHash, 'No pending hash found')
  console.log({ pendingHash })

  const sig1 = await confirmTx(safe1, pendingHash)
  const sig2 = await confirmTx(safe2, pendingHash)
  console.log({ sig1, sig2 })

  const execResult = await execTx(safe0, pendingHash)
  const { hash: txHash } = execResult;
  console.log({ txHash })

  console.log('waiting for confirmation...')
  const receipt = await client.waitForTransactionReceipt({ hash: txHash as `0x${string}`, retryCount: 999 })
  console.log({ receipt })
}

main().catch(console.error);