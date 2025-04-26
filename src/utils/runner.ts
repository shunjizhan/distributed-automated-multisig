export const runWithRetry = async <T>(
  fn: () => Promise<T>,
  retries: number = 10,
  delay: number = 5000,
): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    if (i > 0) {
      console.log(`retrying... ${fn.name} ${i + 1}/${retries}`)
    }
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('All retries failed');
};

