require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const LinkModel = require('./models/linkModel');

const app = express();
const port = process.env.PORT || 3000;

let dbConfig;

if (process.env.DATABASE_URL) {
  dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  };
} else {
  const dbUser = process.env.DB_USER || process.env.DB_USERNAME;
  const dbPassword = process.env.DB_PASSWORD;
  const dbHost = process.env.DB_HOST;
  const dbPort = process.env.DB_PORT || 5432;
  const dbName = process.env.DB_NAME;

  if (!dbUser || !dbPassword || !dbHost || !dbName) {
    console.error('Missing database settings. Please check your .env file.');
    console.error('Required: DB_HOST, DB_USERNAME, DB_PASSWORD, and DB_NAME');
    process.exit(1);
  }

  dbConfig = {
    host: dbHost,
    port: parseInt(dbPort),
    database: dbName,
    user: dbUser,
    password: dbPassword,
    ssl: { rejectUnauthorized: false }
  };
}

const pool = new Pool(dbConfig);

pool.on('error', (err) => {
  console.error('Database connection problem:', err.message);
  process.exit(-1);
});

pool.on('connect', () => {
  console.log('Connected to database');
});

const linkModel = new LinkModel(pool);
linkModel.createTable().catch((err) => {
  console.error('Could not create database table:', err.message);
});

app.use(express.json());

const linkRoutes = require('./routes/linkRoutes')(pool);
app.use('/api/links', linkRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
