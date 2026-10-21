import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://localhost:27017/chrono_atelier_db';
    console.log('⏳ Connecting to MongoDB Atlas...');
    const conn = await mongoose.connect(connStr, {
      dbName: 'chrono_atelier_db',
    });
    console.log(`🍃 MongoDB Atlas Connected: ${conn.connection.host} [DB: ${conn.connection.name}]`);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
  }
};
