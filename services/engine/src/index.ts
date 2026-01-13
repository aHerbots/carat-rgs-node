import { NativeConnection, Worker } from '@temporalio/worker';
import * as activities from './activities';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
  });

  const worker = await Worker.create({
    connection,
    namespace: 'default',
    taskQueue: 'engine-tasks',
    activities,
  });

  console.log('Engine Worker started on task queue: engine-tasks');
  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
