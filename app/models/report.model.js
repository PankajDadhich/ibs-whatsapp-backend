const sql = require("./db.js");

let schema = '';
function init(schema_name){
    this.schema = schema_name;
}

//....................................... create report.........................................
async function create(newReport, userid){
    delete newReport.id;
    console.log("this.schema ==> ", this.schema);
    const result = await sql.query(`INSERT INTO ${this.schema}.report (name, query, apiname, filterdataquery, filterrowquery, discription, iscustom, sortingdata, ownerid, createdbyid, lastmodifiedbyid)  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`, 
    [newReport.name, newReport.query, newReport.apiname, newReport.filterdataquery, newReport.filterrowquery, newReport.discription , newReport.iscustom, newReport.sortingdata, userid, userid, userid]);
    if(result.rows.length > 0){
      return { id: result.rows[0].id, ...newReport};
    }
    return null;
};

//.....................................find report by id........................................
async function findById(id) {
  console.log(this.schema)
  const result = await sql.query(`SELECT * FROM ${this.schema}.report WHERE id = $1`, [id]);
  console.log(result)
  if (result) {
    console.log("query ==> ", result.rows[0]);
    const query = result.rows[0];
    if (query) {
      console.log("query ==> ", result.rows[0]);
      return query;
    }
  }
  return null;
};

//.....................................find report by id........................................
async function findByName (name) {

  const result = await sql.query(`SELECT * FROM ${this.schema}.report WHERE apiname = $1`,[name]);
  
  if(result.rows.length > 0){
      console.log("query ", result.rows[0].query);
      const query = result.rows[0].query;
      if(query) {
          console.log("query ", result.rows[0].query);

          const allData = await fetchData(query);
          console.log("allData ",allData);
          return allData;
      }
      return null;
  }  
return null;
};

async function fetchData(query) {

    const result = await sql.query(query);
    return result.rows;
 }


//.......................................find all report................................
async function findAll(reportname){
    let query = `SELECT * FROM ${this.schema}.report`;
    query += " ORDER BY createddate DESC ";

    if (reportname) {
      query += ` WHERE name LIKE '%${reportname}%'`;
    }
  
    const result = await sql.query(query);
    console.log('rows:===>', result.rows);
    return result.rows 
};

 

//..............................................Update report................................
async function updateById (id, newReport, userid){
    delete newReport.id;
    console.log("usrr",userid)
    newReport['lastmodifiedbyid'] = userid;
    const query = buildUpdateQuery(id, newReport, this.schema);
    // Turn req.body into an array of values
    var colValues = Object.keys(newReport).map(function (key) {
      return newReport[key];
    });
  
    //console.log('query:', query);
    const result = await sql.query(query,colValues);
    if(result.rowCount > 0){
      return {"id" : id, ...newReport};
    }
    return null;  
};


//.....................................................Delete report...........................
async function deleteReport(id){
    const result = await sql.query(`DELETE FROM ${this.schema}.report WHERE id = $1`, [id]);
  
    if(result.rowCount > 0)
      return "Success"
    return null;
};

function buildUpdateQuery (id, cols, schema) {
   // Setup static beginning of query
   var query = [`UPDATE ${schema}.report`];
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

module.exports = {findById, findByName, updateById, findAll, create, deleteReport, init};