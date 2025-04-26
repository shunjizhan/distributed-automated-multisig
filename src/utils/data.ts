import { address, Address, Dictionary } from '@ton/core';
import { TonClient } from '@ton/ton';

import { Multisig, MultisigOrder } from './wrappers';
import { runWithRetry } from './runner';

export type MultisigData = {
  nextOrderSeqno: string;
  threshold: string;
  signers: string[];
  proposers: string[];
};

export async function getMultisigData(
  client: TonClient,
  multisigAddr: Address
): Promise<MultisigData> {
  const multisig = new Multisig(multisigAddr);
  const openedMultisig = client.open(multisig);
  const data = await runWithRetry(() => openedMultisig.getMultisigData());

  return {
    nextOrderSeqno: data.nextOrderSeqno.toString(),
    threshold: data.threshold.toString(),
    signers: data.signers.map(signer => signer.toString()),
    proposers: data.proposers.map(proposer => proposer.toString()),
  };
};

export async function getOrderAddress(
  client: TonClient,
  multisigAddr: Address,
  orderSeqno: bigint,
): Promise<string> {
  const multisig = new Multisig(multisigAddr);
  const openedMultisig = client.open(multisig);
  const orderAddr = await runWithRetry(() => openedMultisig.getOrderAddress(orderSeqno));

  return orderAddr.toString();
}

export const getOrderData = async (client: TonClient, orderAddr: Address) => {
  const order = new MultisigOrder(orderAddr);
  const openedOrder = client.open(order);
  const data = await runWithRetry(() => openedOrder.getOrderData());

  return {
    inited: data.inited,
    multisig: data.multisig.toString(),
    orderSeqno: data.order_seqno,
    threshold: data.threshold,
    executed: data.executed,
    signers: data.signers.map(signer => signer.toString()),
    approvals: data.approvals,
    approvalsNum: data.approvals_num,
    expirationDate: data.expiration_date?.toString(),
    order: data.order?.toString(),
  }
}

const executedOrderSeqNumbers = new Set<number>();
export const getPendingOrders = async (
  client: TonClient,
  multisigAddr: string,
  signerAddr: string
) => {
  const multisig = client.open(new Multisig(Address.parse(multisigAddr)));
  const { nextOrderSeqno } = await runWithRetry(() => multisig.getMultisigData());

  const checkingSeqNumbers = Array.from({ length: Number(nextOrderSeqno) }, (_, i) => i)
    .filter(i => !executedOrderSeqNumbers.has(i));

  const orderConfigs = await Promise.all(checkingSeqNumbers.map(
    async (i) => {
      const orderAddr = await runWithRetry(() => multisig.getOrderAddress(BigInt(i)));
      return {
        multisig: multisig.address,
        orderSeqno: Number(i),
        orderAddr: orderAddr,
      };
    }
  ));

  const orderDetails = await Promise.all(orderConfigs.map(
    async orderConfig => {
      const data = await runWithRetry(() => getOrderData(client, orderConfig.orderAddr))
      return {
        ...data,
        ...orderConfig,
      }
    }
  ));

  const pendingOrders = orderDetails.filter(({ threshold, approvals, signers, inited }) =>
      inited
      && approvals.filter(x => x === true).length < threshold!
      && signers.some(s => Address.parse(s).equals(Address.parse(signerAddr)))
      && !approvals[signers.findIndex(s => Address.parse(s).equals(Address.parse(signerAddr)))]
  );

  const pendingSeqNumbers = pendingOrders.map(({ orderSeqno }) => orderSeqno);

  // record executed sequence numbers
  const _executedOrderSeqNumbers = checkingSeqNumbers.filter(
    i => !pendingSeqNumbers.includes(i)
  );
  _executedOrderSeqNumbers.forEach(i => executedOrderSeqNumbers.add(i));

  console.log(`found ${pendingOrders.length} pending orders`)
  return pendingOrders;
}
