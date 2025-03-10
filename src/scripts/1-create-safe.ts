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

dotenv.config();

async function main() {
    const privateKeys = process.env.KEYS?.split(',') || [];
    if (privateKeys.length !== 3) {
      throw new Error('Expected 3 private keys in the KEYS environment variable');
    }

    const [account1, account2, account3] = privateKeys.map(key => privateKeyToAccount(`0x${key}`));
    const owners = [account1.address, account2.address, account3.address];
    const threshold = 2;

    const client = createWalletClient({
      chain: sepolia,
      transport: http(),
      account: account1,
    }).extend(publicActions);


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

    console.log(`transactionReceipt: ${transactionReceipt}`);
}

main().catch(console.error);