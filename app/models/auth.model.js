const sql = require("./db.js");
const global = require("../constants/global.js");


// async function createUser (newUser){

//   const {firstname, lastname, email,phone, password, userrole, companyid} = newUser;
//   const result = await sql.query("INSERT into public.user (firstname, lastname, email,phone, password, userrole, companyid) VALUES ($1, $2, $3, $4, $5, $6,$7) RETURNING id, firstname, lastname, email,phone, password, userrole, companyid", [firstname, lastname, email,phone, password, userrole, companyid]);
//   if(result.rowCount > 0){
//     return result.rows[0];
//   }
//   return null;     
// };
async function createUser(newUser) {

  const { firstname, lastname, email, phone, password, userrole, companyid, managerid, isactive, whatsapp_number,whatsapp_settings } = newUser;
  const result = await sql.query("INSERT into public.user (firstname, lastname, email,phone, password, userrole, companyid, managerid,isactive, whatsapp_number,whatsapp_settings) VALUES ($1, $2, $3, $4, $5, $6,$7, $8,$9, $10, $11) RETURNING id, firstname, lastname, email,phone, password, userrole, companyid,managerid,isactive, whatsapp_number, whatsapp_settings", [firstname, lastname, email, phone, password, userrole, companyid, managerid, isactive, whatsapp_number, whatsapp_settings]);
  if (result.rowCount > 0) {
    return result.rows[0];
  }
  return null;
};


async function setRole(userrole, userRec) {

  let roleId = userrole == 'ADMIN' ? global.ADMIN_ROLE_ID : global.USER_ROLE_ID;
  const result = await sql.query("INSERT into public.userrole (roleid, userid) VALUES ($1, $2) RETURNING * ",
    [roleId, userRec.id]);


  if (result.rowCount > 0) {
    return result.rows[0];
  }
  return null;

};

async function checkLicenses(companyid, currentUserId) {
  const company = await sql.query("SELECT userlicenses from company where id = $1 ",
    [companyid]);
  let allowedUserLicenses = 0;
  if (company.rowCount > 0) {
    allowedUserLicenses = company.rows[0].userlicenses;
  }
  let result = null;
  if (currentUserId) {
    result = await sql.query("SELECT count(*) total from public.user where companyid = $1 AND isactive=true AND id != $2",
      [companyid, currentUserId]);
  } else {
    result = await sql.query("SELECT count(*) total from public.user where companyid = $1 AND isactive=true",
      [companyid]);
  }


  let existingLicenses = 0;
  if (result.rowCount > 0) {
    existingLicenses = result.rows[0].total;
  }

  if (allowedUserLicenses > existingLicenses)
    return true;
  else
    return false;


};


async function findByEmail(email) {
//   const result = await sql.query(`select
//   json_build_object(
//           'id', u.id,
//           'firstname', u.firstname,
//           'lastname', u.lastname,
//           'email', u.email,
//           'phone',u.phone,
//           'whatsapp_number',u.whatsapp_number,
//           'userrole', u.userrole,
//           'companyid', u.companyid,          
//           'password', u.password,
//           'whatsapp_settings', u.whatsapp_settings,
//           'companyname', c.name,
//           'tenantcode', c.tenantcode,
//           'logourl', c.logourl,
//           'sidebarbgurl', c.sidebarbgurl,
//           'permissions', json_agg(json_build_object(
//                   'name', PERMISSION.name
//           ))
// ) AS userinfo
// FROM ROLEPERMISSION
// INNER JOIN ROLE ON ROLEPERMISSION.roleid = ROLE.id
// INNER JOIN PERMISSION ON ROLEPERMISSION.permissionid =  PERMISSION.id 
// INNER JOIN USERROLE ON USERROLE.roleid = ROLEPERMISSION.roleid
// INNER JOIN public.USER u ON USERROLE.userid = u.id
// INNER JOIN public.COMPANY c ON u.companyid = c.id
// WHERE u.email = $1 AND u.isactive = true
// GROUP BY u.email, u.id, u.firstname, u.companyid, c.name, c.tenantcode, c.logourl, c.sidebarbgurl`, [email]);
  const result = await sql.query(`SELECT
  json_build_object(
    'id', u.id,
    'firstname', u.firstname,
    'lastname', u.lastname,
    'email', u.email,
    'phone', u.phone,
    'password', u.password,
    'userrole', u.userrole,
    'companyid', u.companyid,
    'whatsapp_settings', u.whatsapp_settings,
    'companyname', c.name,
    'companystreet', c.street,
    'companycity', c.city,
    'companypincode', c.pincode,
    'companystate', c.state,
    'companycountry', c.country,
    'tenantcode', c.tenantcode,
    'logourl', c.logourl,
    'subscription', json_build_object(
        'id', s.id,
        'validity', s.validity,
        'end_date', CASE 
                      WHEN i.status = 'Complete' THEN s.end_date 
                      ELSE NULL 
                    END
      ),
    'plan', json_build_object(
      'id', p.id,
      'name', p.name,
      'number_of_whatsapp_setting', COALESCE(p.number_of_whatsapp_setting, 0),
      'number_of_users', COALESCE(p.number_of_users, 0)
    ),
    'modules', COALESCE(
      json_agg(
         json_build_object(
          'id', m.id,
          'name', m.name,
          'url', m.url,
          'icon', m.icon,
          'order_no', m.order_no,
          'status', m.status
        )
      ) FILTER (WHERE pm.moduleid IS NOT NULL AND m.status = 'active' ), '[]'
    )
  ) AS userinfo
FROM public.user u
INNER JOIN public.company c ON u.companyid = c.id
LEFT JOIN public.subscriptions s ON s.company_id = c.id
LEFT JOIN public.invoices i ON s.id = i.subscription_id
LEFT JOIN public.plans p ON s.plan_id = p.id
LEFT JOIN public.plan_module pm ON pm.planid = p.id
LEFT JOIN public.module m ON pm.moduleid = m.id
WHERE u.email = $1 AND c.isactive = true AND  u.isactive = true
GROUP BY 
  u.id, u.firstname, u.lastname, u.email, u.password, u.userrole, u.companyid,
  c.id, c.name, c.street, c.city, c.pincode, c.state, c.country, c.tenantcode,
  s.id, s.validity,
  p.id, p.name, p.number_of_whatsapp_setting, i.status`, [email]);
  if (result.rows.length > 0)
    return result.rows[0];
  return null;
};



async function findById(id) {
  try {

    let query = `SELECT u.id, u.email, concat(u.firstname,' ', u.lastname) contactname, u.firstname, u.lastname, u.userrole, u.phone, u.isactive, u.managerid, concat(mu.firstname,' ', mu.lastname) managername, u.whatsapp_number, u.whatsapp_settings  FROM public.user u`;
    query += ` LEFT JOIN public.user mu ON mu.id = u.managerid `;
    query += ` WHERE u.id = $1`;
    const result = await sql.query(query, [id]);
    if (result.rows.length > 0)
      return result.rows[0];
  } catch (error) {
    console.log("error ", error);
  }

  return null;
};

async function updateRecById(id, userRec, userid) {
  delete userRec.id;
  //userRec['lastmodifiedbyid'] = userid;
  const query = buildUpdateQuery(id, userRec);
  // Turn req.body into an array of values
  var colValues = Object.keys(userRec).map(function (key) {
    return userRec[key];
  });

  try {
    const result = await sql.query(query, colValues);
    if (result.rowCount > 0) {
      return { "id": id, ...userRec };
    }
  } catch (error) {
    return { isError: true, errors: error }
  }

  return null;
};

async function updateById(id, userRec) {
  try {
    const result = await sql.query(`UPDATE public.user SET password = $1 WHERE id = $2`, [userRec.password, id]);
    if (result.rowCount > 0)
      return "Updated successfully";
  } catch (error) {
    console.log("error ", error);
  }

  return null;
};



async function findAll(userinfo) {
  try {
    let query = "SELECT u.id, concat(u.firstname, ' ' ,u.lastname) username, concat(mu.firstname,' ', mu.lastname) managername, u.managerid, u.firstname, u.lastname, u.email, u.userrole, u.phone, u.isactive, u.whatsapp_number, u.whatsapp_settings, c.name AS companyname FROM public.user u ";
    query += ` LEFT JOIN public.user mu ON mu.id = u.managerid LEFT JOIN  public.company c ON c.id = u.companyid`;

    if (userinfo.userrole === 'SYS_ADMIN') {
      const result = await sql.query(query);
      
      if (result.rows.length > 0) 
        return result.rows;
    } else {
      query += " WHERE u.companyid = $1 AND (u.id = $2 OR u.managerid = $2)";
      // console.log("query",query);
      // console.log("userinfo.companyid, userinfo.userid",userinfo.companyid, userinfo.id);
      const result = await sql.query(query, [userinfo.companyid, userinfo.id]);

      if (result.rows.length > 0) 
        return result.rows;
    }

  } catch (error) {
    console.log("error ", error);
  }

  return null;
};


function buildUpdateQuery(id, cols) {
  // Setup static beginning of query
  var query = ['UPDATE public.user '];
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

async function getAllManager(role) {
  try {
    //ORDER BY createddate DESC
    var query = "SELECT id, isactive, concat(firstname, ' ' ,lastname) username, userrole FROM public.user WHERE ";
    query += " userrole = 'SYS_ADMIN' OR  userrole = 'ADMIN' ";

    result = await sql.query(query);
    return result.rows;

    // var query = "SELECT id, concat(firstname, ' ' ,lastname) username, firstname, lastname, email, phone, adharcard dob, gender, qualificatoin, street, city, userrole, servicecategory, servicearea FROM public.user WHERE userrole = 'ADMIN'";
    // result = await sql.query(query);
    // return result.rows;
  } catch (errMsg) {
    console.log('errMsg===>', errMsg);
  }


}

async function checkForDuplicate(email, whatsappNumber, userId = null) {
  const params = [email, whatsappNumber];
  let query = `
      SELECT id, email, whatsapp_number
      FROM public.user
      WHERE email = $1
      ${userId ? `AND id != $3` : ''}
      UNION ALL
      SELECT id, email, whatsapp_number
      FROM public.user
      WHERE whatsapp_number = $2
      ${userId ? `AND id != $3` : ''}
     
  `;

  if (userId) {
    params.push(userId);
  }

  try {
    const result = await sql.query(query, params);

    if (result.rows.length > 0) {
      return result.rows[0];
    }
  } catch (error) {
    console.error("Error checking for duplicates:", error);
    throw error;
  }

  return null;
}

async function checkCompanybyTcode(tcode) {
  let query = `SELECT * FROM public.company WHERE LOWER(tenantcode) =  LOWER($1)`;

  try {
    const result = await sql.query(query, [tcode]);
    if (result.rows.length > 0) {
      return result.rows;
    }
  } catch (error) {
    console.error("Error: ", error);
    throw error;
  }

  return null;
}

async function getUserCount(companyId) {
  try {
    const query = 'SELECT COUNT(*) FROM public.user WHERE companyid = $1 AND userrole = $2';
    const result = await sql.query(query, [companyId, 'USER']);
        return parseInt(result.rows[0].count, 10); 
  } catch (error) {
    console.error("Error fetching user count:", error);
    throw new Error("Failed to fetch user count");
  }
}



module.exports = {
  createUser, updateRecById,
  setRole, findByEmail, findById, findAll, updateById, getAllManager,
  checkLicenses, checkForDuplicate, checkCompanybyTcode, getUserCount
};
