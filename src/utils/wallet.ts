import { sepolia } from 'viem/chains';
import { createWalletClient, http, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';

dotenv.config();

export const privateKeys = process.env.KEYS?.split(',') || [];
if (privateKeys.length !== 3) {
  throw new Error('Expected 3 private keys in the KEYS environment variable');
}

export const accounts = privateKeys.map(key => privateKeyToAccount(`0x${key}`));

export const client = createWalletClient({
  chain: sepolia,
  transport: http(),
  account: accounts[0],
}).extend(publicActions);
