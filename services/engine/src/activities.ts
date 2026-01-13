import { pool } from './pool';
import { MathProfile, SpinResult } from './domain/types';

export async function executeSpin(params: { betAmount: number; profile: MathProfile }): Promise<SpinResult> {
  return await pool.run(params);
}
