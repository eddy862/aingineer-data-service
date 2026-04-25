import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import pool from './db'; 

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    // Test DB connection
    await pool.query('SELECT 1');
    console.log("Connected to the database successfully");
  } catch (err) {
    console.error("DB connection failed:", err);
  }
})();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});