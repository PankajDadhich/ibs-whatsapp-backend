const dbConfig = require("../config/db.config.js");

const Pool = require('pg').Pool
const connection = new Pool({
  user: dbConfig.USER,
  host: dbConfig.HOST,
  database: dbConfig.DB,
  password: dbConfig.PASSWORD,
  port: 5432,
})
module.exports = connection;
