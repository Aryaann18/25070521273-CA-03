import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function connectDB() {
  let uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    // No external MongoDB configured: start an embedded one with persistent storage.
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const dbPath = path.resolve(__dirname, '../.mongo-data');
    fs.mkdirSync(dbPath, { recursive: true });
    const mongod = await MongoMemoryServer.create({
      instance: { dbPath, storageEngine: 'wiredTiger', port: 27018 },
    });
    uri = mongod.getUri('taskflow');
    console.log('[db] Embedded MongoDB started (data in server/.mongo-data)');
    const stop = async () => {
      await mongod.stop();
      process.exit(0);
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  }

  await mongoose.connect(uri);
  console.log('[db] Connected to MongoDB');
}
