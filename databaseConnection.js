const postgres = require('postgres');

// Postgres configuration

const sql = postgres({
  host: 'localhost',
  port: 6666,
  database: 'noise_remover',
  username: 'postgres',
  password: '',
})

module.exports = {
  sql: sql,
};
