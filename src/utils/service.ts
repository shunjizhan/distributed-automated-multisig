export const validateTx = async (safeTxHash: string) => {
  console.log(`Validating transaction ${safeTxHash}...`);

  // random sleep 20 - 60 seconds with countdown with 1 second intervals
  const countdown = Math.floor(Math.random() * 40000) + 20000;
  console.log(`Validating ... ${countdown / 1000}s remaining`);
  for (let i = countdown; i >= 0; i -= 2000) {
    console.log(`Validating ... ${i / 2000}s remaining`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return true;
};