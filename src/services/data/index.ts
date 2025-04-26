import express from 'express';
import cors from 'cors';
import { Address } from '@ton/core';

import { getMultisigData, getOrderData, getPendingOrders, jsonParse, jsonStringify, tonClient } from '../../utils';

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.DATA_PORT || 1000;

app.get('/multisig_data/:address', async (req, res) => {
  try {
    const { address } = req.params;
    console.log(`Retrieving data for multisig contract at address: ${address}`);

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address is required'
      });
    }

    try {
      const multisigAddr = Address.parse(address);
      const multisigData = await getMultisigData(tonClient, multisigAddr);

      console.log('Successfully retrieved multisig data');

      res.json({
        success: true,
        data: multisigData
      });
    } catch (error) {
      console.error('Error parsing address or fetching data:', error);
      return res.status(400).json({
        success: false,
        error: 'Invalid address or contract data',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  } catch (error) {
    console.error('Error retrieving multisig data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve multisig data',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// add an endpoint to get order data
app.get('/order_data/:address', async (req, res) => {
  try {
    const { address } = req.params;
    console.log(`Retrieving data for order at address: ${address}`);

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address is required'
      });
    }

    try {
      const orderAddr = Address.parse(address);
      const orderData = await getOrderData(tonClient, orderAddr);

      console.log('Successfully retrieved order data');

      res.json({
        success: true,
        data: jsonParse(orderData)
      });
    } catch (error) {
    console.error('Error retrieving order data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve order data',
    });
    }
  } catch (error) {
    console.error('Error retrieving order data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve order data',
    });
  }
});

app.get('/pending_orders/:multisig_address/:signer_address', async (req, res) => {
  try {
    const { multisig_address, signer_address } = req.params;
    console.log(`Retrieving pending orders for multisig contract at address: ${multisig_address} and signer address: ${signer_address}`);

    const pendingOrders = await getPendingOrders(tonClient, multisig_address, signer_address);

    res.json({
      success: true,
      data: jsonParse(pendingOrders)
    });
  } catch (error) {
    console.error('Error retrieving pending orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve pending orders',
    });
  }
});

app.listen(PORT, () => {
  console.log(`data service running on http://localhost:${PORT}`);
});