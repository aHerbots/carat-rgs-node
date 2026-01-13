import crypto from 'crypto';

export interface Generator {
  intn(n: number): Promise<number>;
}

export class CryptoGenerator implements Generator {
  async intn(n: number): Promise<number> {
    if (n <= 0) {
      throw new Error('n must be positive');
    }
    return crypto.randomInt(n);
  }
}
