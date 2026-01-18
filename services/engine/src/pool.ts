import { Piscina } from 'piscina';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if we're running from a .ts file (development with tsx/ts-node)
// or a .js file (production build)
const isTs = __filename.endsWith('.ts');
const workerFile = isTs ? 'worker.ts' : 'worker.js';

export const pool = new Piscina({
  filename: path.resolve(__dirname, workerFile),
  minThreads: Math.min(os.cpus().length, 4),
  maxThreads: os.cpus().length,
  idleTimeout: 30000,
});
