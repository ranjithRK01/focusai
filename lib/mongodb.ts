import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || '';
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

if (!MONGO_URI && !isBuildPhase) {
  console.warn('MONGO_URI is not set. Database-backed routes will return errors until it is configured.');
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (!MONGO_URI) {
    if (isBuildPhase) {
      return null;
    }

    throw new Error('Please define the MONGO_URI environment variable inside .env.local');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4 // Force IPv4 to avoid some DNS issues
    };

    cached.promise = mongoose.connect(MONGO_URI, opts).then(async (mongoose) => {
      // Ensure all indexes are created
      await Promise.all([
        import('@/models/User'),
      ]);
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;