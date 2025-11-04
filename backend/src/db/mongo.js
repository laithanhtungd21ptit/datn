import mongoose from 'mongoose';

export async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    // eslint-disable-next-line no-console
    console.warn('MONGODB_URI is not set. Skipping MongoDB connection.');
    return;
  }
  try {
    await mongoose.connect(uri, { autoIndex: true });
    // eslint-disable-next-line no-console
    console.log('Connected to MongoDB');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('MongoDB connection error:', err?.message || err);
  }
}


