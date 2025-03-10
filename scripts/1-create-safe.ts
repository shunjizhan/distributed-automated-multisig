import Safe, {
  PredictedSafeProps,
  SafeAccountConfig,
  SafeDeploymentConfig
} from '@safe-global/protocol-kit'
import { sepolia } from 'viem/chains'
import dotenv from 'dotenv';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, formatEther, http, publicActions } from 'viem';
import { getBalance } from 'viem/actions';

import { accounts, client, privateKeys } from '../src/utils';

dotenv.config();

async function main() {
    const [account1, account2, account3] = accounts;
    const owners = accounts.map(acc => acc.address);
    const threshold = 3;

    const balance = await getBalance(client, {
      address: account1.address,
    });
    console.log(`Signer 1 balance: ${formatEther(balance)} ETH`);

    if (balance === BigInt(0)) {
      throw new Error(`Signer 1 has no ETH. Please fund the account: ${account1.address}`);
    }

    const safeAccountConfig: SafeAccountConfig = {
      owners,
      threshold
    };

    const predictedSafe: PredictedSafeProps = {
      safeAccountConfig
    };

    const protocolKit = await Safe.init({
      provider: sepolia.rpcUrls.default.http[0],
      signer: privateKeys[0],
      predictedSafe,
    });

    const safeAddress = await protocolKit.getAddress()
    console.log(`predicted Safe address: ${safeAddress}`);

    const deploymentTransaction = await protocolKit.createSafeDeploymentTransaction()
    console.log(`deploymentTransaction: ${JSON.stringify(deploymentTransaction)}`);

    const transactionHash = await client.sendTransaction({
      to: deploymentTransaction.to,
      value: BigInt(deploymentTransaction.value),
      data: deploymentTransaction.data as `0x${string}`,
      chain: sepolia
    });

    const transactionReceipt = await client.waitForTransactionReceipt({
      hash: transactionHash,
      retryCount: 999,
    })

    console.log(`transactionReceipt: ${JSON.stringify(transactionReceipt)}`);
}

main().catch(console.error);