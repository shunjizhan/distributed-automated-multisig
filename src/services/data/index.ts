import express from 'express';
import cors from 'cors';
import { Address } from '@ton/core';

import { getMultisigData, tonClient } from '../../utils';

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

app.listen(PORT, () => {
  console.log(`data service running on http://localhost:${PORT}`);
});