import { Piscina } from 'piscina';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const pool = new Piscina({
  filename: path.resolve(__dirname, 'worker.js'),
  minThreads: Math.min(os.cpus().length, 4),
  maxThreads: os.cpus().length,
  idleTimeout: 30000,
});
