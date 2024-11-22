// src/db.js
const mongoose = require("mongoose");
require("dotenv").config();
const connectToDb = async () => {
  // console.log("MongoDB URI:", process.env.MONGODB_URI); // Debugging line
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

module.exports = connectToDb;
