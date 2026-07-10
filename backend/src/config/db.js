const mongoose = require('mongoose');
const { mongodbUri } = require('./env');

mongoose.set('strictQuery', true);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });

    const { host, name } = conn.connection;
    console.log(`MongoDB Connected: ${name} @ ${host}`);

    if (process.env.NODE_ENV === 'production') {
      try {
        const admin = conn.connection.db.admin();
        const { ok, setName } = await admin.command({ hello: 1 });
        if (!ok || !setName) {
          throw new Error('MongoDB replica set is required for production wallet transactions');
        }
        console.log(`MongoDB replica set: ${setName}`);
      } catch (error) {
        if (error.message?.includes('replica set')) throw error;
        // hello may fail on some Atlas configs — fall back to isMaster
        const info = await conn.connection.db.admin().command({ isMaster: 1 });
        if (!info.setName) {
          throw new Error('MongoDB replica set is required for production wallet transactions');
        }
        console.log(`MongoDB replica set: ${info.setName}`);
      }
    }

    return conn;
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
