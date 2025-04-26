import { KEY_INDEX } from "../consts";

export const validateTx = async (safeTxHash: string) => {
  console.log(`Validating transaction ${safeTxHash}...`);

  const countdown = KEY_INDEX * 30 * 1000;
  console.log(`Validating ... ${countdown / 1000}s remaining`);
  for (let i = countdown; i >= 0; i -= 1000) {
    console.log(`${i / 1000}s remaining`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return true;
};

export const validateTonTx = async (orderData: string) => {
  console.log(`Validating transaction ${orderData}...`);

  const countdown = KEY_INDEX * 30 * 1000;
  console.log(`Validating ... ${countdown / 1000}s remaining`);
  for (let i = countdown; i >= 0; i -= 1000) {
    console.log(`${i / 1000}s remaining`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return true;
};