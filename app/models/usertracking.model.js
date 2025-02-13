const sql = require("./db.js");

let schema = '';
function init(schema_name) {
  this.schema = schema_name;
}

//....................................... create usertracking.........................................
async function create(newUserTracking, userid) {
  delete newUserTracking.id;
  const result = await sql.query(`INSERT INTO ${this.schema}.usertracking (location, logindatetime, loginlattitude, loginlongitude, logoutdatetime, logoutlattitude, logoutlongitude, remarks, parentid)  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [newUserTracking.location, newUserTracking.logindatetime, newUserTracking.loginlattitude, newUserTracking.loginlongitude, newUserTracking.logoutdatetime, newUserTracking.logoutlattitude, newUserTracking.logoutlongitude, newUserTracking.remarks, userid]);
  if (result.rows.length > 0) {
    return { id: result.rows[0].id, ...newUserTracking };
  }
  return null;
};


//.....................................find usertracking by id........................................
async function findById(id) {
  const result = await sql.query(`SELECT * FROM ${this.schema}.usertracking WHERE id = $1`, [id]);
  if (result.rows.length > 0) {
    return result.rows[0];
  }
  return null;
};


//.......................................find all usertracking................................
async function findAll() {
  let query = `SELECT * FROM ${this.schema}.usertracking ORDER BY createddate DESC`;
  const result = await sql.query(query);
  return result.rows
};


//..............................................Update usertracking................................
async function updateById(id, newUserTracking, userid) {
  delete newUserTracking.id;
  const query = buildUpdateQuery(id, newUserTracking, this.schema);
  // Turn req.body into an array of values
  var colValues = Object.keys(newUserTracking).map(function (key) {
    return newUserTracking[key];
  });

  const result = await sql.query(query, colValues);
  if (result.rowCount > 0) {
    return { "id": id, ...newUserTracking };
  }
  return null;
};

//.....................................................Delete usertracking...........................
async function deleteUserTracking(id) {
  const result = await sql.query(`DELETE FROM ${this.schema}.usertracking WHERE id = $1`, [id]);
  //const result = await sql.query("DELETE FROM public.usertracking ");
  if (result.rowCount > 0)
    return "Success"
  return null;
};

async function findCurrentRecordByUserId(staffId) {
  const query = `SELECT * FROM ${this.schema}.usertracking WHERE parentid = $1 order by logindatetime desc limit 1`;
  const result = await sql.query(query, [staffId]);
  if (result.rows.length > 0) {
    return result.rows[0];
  }
  return null;
};


async function getStaffLoginHistory(staffId) {


  const query = `SELECT * FROM ${this.schema}.usertracking WHERE parentid = $1 order by logindatetime DESC`;
  const result = await sql.query(query, [staffId]);
  if (result.rows) {
    return result.rows;
  }
  return null;
};


function buildUpdateQuery(id, cols, schema) {
  // Setup static beginning of query
  var query = [`UPDATE ${schema}.usertracking`];
  query.push('SET');

  // Create another array storing each set command
  // and assigning a number value for parameterized query
  var set = [];
  Object.keys(cols).forEach(function (key, i) {
    set.push(key + ' = ($' + (i + 1) + ')');
  });
  query.push(set.join(', '));

  // Add the WHERE statement to look up by id
  query.push('WHERE id = \'' + id + '\'');

  // Return a complete query string
  return query.join(' ');
}

module.exports = { findById, findAll, create, deleteUserTracking, updateById, findCurrentRecordByUserId, getStaffLoginHistory, init };