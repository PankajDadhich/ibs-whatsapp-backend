/**
 * @author      Abdul Pathan
 * @date        Aug, 2024
 * @copyright   www.ibirdsservices.com
 */

const sql = require("./db.js");

let schema = '';
function init(schema_name) {
  this.schema = schema_name;
}

// async function insertFileRecords(newFile, userid) {

//   const result = await sql.query(`INSERT INTO ${this.schema}.file ( title, filetype, filesize, description, parentid, createdbyid, lastmodifiedbyid)  VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
//     [newFile.title, newFile.filetype, newFile.filesize, newFile.description, newFile.parentid, userid, userid]);

//   return result.rows.length > 0 ? result.rows[0] : null;
// }

async function insertFileRecords(newFile, userid) {

  const parentId = newFile.parentid === "null" || !newFile.parentid ? null : newFile.parentid;

  const result = await sql.query(
    `INSERT INTO ${this.schema}.file (title, filetype, filesize, description, parentid, createdbyid, lastmodifiedbyid)  
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [newFile.title, newFile.filetype, newFile.filesize, newFile.description, parentId, userid, userid]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}
 


async function findByParentId(id) {
  let query = "SELECT fl.*, ";
  query += " concat(cu.firstname, ' ' , cu.lastname) createdbyname,  ";
  query += " concat(mu.firstname, ' ' , mu.lastname) lastmodifiedbyname  ";
  query += ` FROM ${this.schema}.file fl `;
  query += ` INNER JOIN ${this.schema}.user cu ON cu.Id = fl.createdbyid `;
  query += ` INNER JOIN ${this.schema}.user mu ON mu.Id = fl.lastmodifiedbyid `;
  const result = await sql.query(query + 'WHERE fl.parentid = $1', [id]);

  if (result.rows.length > 0)
    // return result.rows[0];
    return result.rows;

  return null;
};

async function deleteFile(id) {
  const result = await sql.query(`DELETE FROM ${this.schema}.file WHERE id = $1`, [id]);

  if (result.rowCount > 0)
    return "Success"
  return null;
};

async function findById(id) {
  //const result = await sql.query(`SELECT * FROM file WHERE id = $1`,[id]);
  let query = "SELECT fl.*, ";
  query += " concat(cu.firstname, ' ' , cu.lastname) createdbyname,  ";
  query += " concat(mu.firstname, ' ' , mu.lastname) lastmodifiedbyname  ";
  query += ` FROM ${this.schema}.file fl `;
  query += ` INNER JOIN ${this.schema}.user cu ON cu.Id = fl.createdbyid `;
  query += ` INNER JOIN ${this.schema}.user mu ON mu.Id = fl.lastmodifiedbyid `;
  const result = await sql.query(query + 'WHERE fl.id = $1', [id]);



  if (result.rows.length > 0)
    return result.rows[0];

  return null;
};

async function updateById(id, newFile) {
  delete newFile.id;
  const query = buildUpdateQuery(id, newFile, this.schema);
  // Turn req.body into an array of values
  var colValues = Object.keys(newFile).map(function (key) {
    return newFile[key];
  });

  const result = await sql.query(query, colValues);
  if (result.rowCount > 0) {
    return { "id": id, ...newFile };
  }
  return null;
};



function buildUpdateQuery(id, cols, schema) {
  // Setup static beginning of query
  var query = [`UPDATE ${schema}.file`];
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


module.exports = { insertFileRecords, findByParentId, deleteFile, findById, init };