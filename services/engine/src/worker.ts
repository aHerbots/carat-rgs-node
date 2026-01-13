import { SlotMachine } from './domain/slot-machine';
import { CryptoGenerator } from './domain/rng';
import { MathProfile } from './domain/types';

export default async ({ betAmount, profile }: { betAmount: number; profile: MathProfile }) => {
  const rng = new CryptoGenerator();
  const machine = new SlotMachine(rng, profile);
  return await machine.spin(betAmount);
};
