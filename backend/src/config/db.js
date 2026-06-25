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
    return conn;
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
