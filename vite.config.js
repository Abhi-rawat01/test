import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { randomFillSync, webcrypto } from 'node:crypto';

const ensureCryptoSupport = () => {
  const existingCrypto = globalThis.crypto;

  if (existingCrypto?.getRandomValues) {
    return;
  }

  if (!existingCrypto && webcrypto?.getRandomValues) {
    globalThis.crypto = webcrypto;
    return;
  }

  const target = existingCrypto ?? {};

  if (webcrypto?.getRandomValues) {
    target.getRandomValues = webcrypto.getRandomValues.bind(webcrypto);
  } else {
    target.getRandomValues = (typedArray) => randomFillSync(typedArray);
  }

  if (!existingCrypto) {
    globalThis.crypto = target;
  }
};

ensureCryptoSupport();

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  }
});
