const sql = require("./db.js");
let schema = '';

function init(schema_name){
    this.schema = schema_name;
}

//.....................................find fields by tablename........................................
async function findFieldsTableName(tablename) {
    //console.log("id ", id);
    //const result = await sql.query(`SELECT * FROM ${this.schema}.order WHERE id = $1`,[id]);
    const result = await sql.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'ibs_ibirds' AND table_name = $1`,
      [tablename]
    );
    if (result.rows.length > 0) {
      return result.rows;
    }
    return null;
  }

//.....................................find all tables....................................

async function findAll() {
    let query = "select table_name FROM information_schema.tables WHERE table_schema = 'ibs_ibirds'";
    console.log('query', query);
    const result = await sql.query(query);
    if(result){
      console.log('result',result)
      return result.rows; 
    }else{
      return null
    }
};

//   Find all records according to query 
async function findAllRecords(queryPass) {
    console.log('queryPass', queryPass);
    let queryRecords = queryPass;
    console.log('queryRecords', queryRecords);
    const result = await sql.query(queryRecords);
    if(result){
      console.log('result',result)
      return result.rows; 
    }else{
      return null
    }       
};

//   Find group by  according to query 
async function findGroupByRecords(queryPass) {
  console.log('queryPass', queryPass);
  let queryRecords = queryPass;
  console.log('queryRecords', queryRecords);
  const result = await sql.query(queryRecords);
  console.log('result',result)
  if(result){
    console.log('result',result)
    return result.rows; 
  }else{
    return null
  }  
};

//   Find all records according to query 
async function findAllFilterRecords(queryPass) {
    console.log('queryPass', queryPass);
    let queryRecords = queryPass;
    console.log('queryRecords', queryRecords);
    const result = await sql.query(queryRecords);
    if(result){
      console.log('result',result)
      return result.rows; 
    }else{
      return null
    }
};
module.exports = {findFieldsTableName, findAll, init,findAllRecords,findAllFilterRecords,findGroupByRecords};