// Events database module.
// Opens the MySQL connection used by the API and exposes a connectivity check.

const mysql = require('mysql2');
const dbDetails = require('./db-details');

const CONNECTION_OPTIONS = {
  ...dbDetails,
  dateStrings: true,      // Return date and datetime values as year month day strings.
  decimalNumbers: true,   // Return decimal values as numbers instead of strings.
  charset: 'utf8mb4'
};

// One shared connection, opened on first use.
let connection = null;

// Returns the shared connection, creating and opening it the first time.
async function getConnection() {
  if (!connection) {
    const raw = mysql.createConnection(CONNECTION_OPTIONS);

    // Without a listener an unexpected connection error would stop the API.
    raw.on('error', (err) => {
      console.error('[MySQL connection error]', err.message);
      connection = null;      // The next request opens a fresh connection.
    });

    const created = raw.promise();
    await created.connect();
    connection = created;
  }
  return connection;
}

// Queries the server version and current database to confirm the connection.
async function testConnection() {
  const db = await getConnection();
  const [rows] = await db.query('SELECT VERSION() AS version, DATABASE() AS db');
  console.log('Connected to MySQL', rows[0].version, '| database:', rows[0].db);
}

module.exports = { getConnection, testConnection };
