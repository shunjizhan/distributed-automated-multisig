import { Address, Dictionary } from '@ton/core';
import { TonClient } from '@ton/ton';

export type MultisigData = {
  nextOrderSeqno: string;
  threshold: string;
  signers: string[];
  proposers: string[];
};

export async function getMultisigData(client: TonClient, address: Address): Promise<MultisigData> {
  const result = await client.runMethod(address, 'get_multisig_data');
  const stack = result.stack;

  // Parse results from the stack
  const nextOrderSeqno = stack.readBigNumber().toString();
  const threshold = stack.readBigNumber().toString();
  console.log({ nextOrderSeqno, threshold })

  // Extract signers
  const signersCell = stack.readCell();
  const signers: string[] = [];
  try {
    const signersDict = Dictionary.loadDirect(
      Dictionary.Keys.Uint(8),
      Dictionary.Values.Address(),
      signersCell
    );

    for (const [_, value] of signersDict) {
      signers.push(value.toString());
    }
  } catch (error) {
    console.error('Error parsing signers dictionary:', error);
  }
  console.log({ signers })

  // Extract proposers
  const proposersCell = stack.readCellOpt();
  const proposers: string[] = [];
  if (proposersCell) {
    try {
      const proposersDict = Dictionary.loadDirect(
        Dictionary.Keys.Uint(8),
        Dictionary.Values.Address(),
        proposersCell
      );

      for (const [_, value] of proposersDict) {
        proposers.push(value.toString());
      }
    } catch (error) {
      console.error('Error parsing proposers dictionary:', error);
    }
  }

  // Return the data
  return {
    nextOrderSeqno,
    threshold,
    signers,
    proposers
  };
};