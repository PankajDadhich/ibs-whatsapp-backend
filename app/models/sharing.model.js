let schema = '';
function init(schema_name){
    this.schema = schema_name;
}
//................ Create Lead ................
async function filterByOwnerId(leads, userinfo){


let filteredRows = leads.filter(function (row) {
        if(userinfo.userrole === "SYS_ADMIN")
            return true;
        else if(userinfo.userrole === "ADMIN")
            return true;
        else if(userinfo.userrole === "USER")
            return row.ownerid === userinfo.id;
        else
            return false;
      });

      return filteredRows;
  };


module.exports = { filterByOwnerId};
