import mongoose from 'mongoose';

// Cache connection for serverless (Vercel)
let cachedConnection = null;

export async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    // eslint-disable-next-line no-console
    console.warn('MONGODB_URI is not set. Skipping MongoDB connection.');
    return;
  }

  // Return cached connection if exists and is connected
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('Using cached MongoDB connection');
    return cachedConnection;
  }

  try {
    // Optimize for serverless with connection pooling
    const options = {
      autoIndex: true,
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 2, // Minimum number of connections
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      retryReads: true,
    };

    await mongoose.connect(uri, options);
    cachedConnection = mongoose.connection;
    // eslint-disable-next-line no-console
    console.log('Connected to MongoDB');
    return cachedConnection;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('MongoDB connection error:', err?.message || err);
    cachedConnection = null;
    throw err;
  }
}


