const sql = require("./db.js");

let schema = '';

function init(schema_name) {
  this.schema = schema_name;
}

async function create(newMessage, userid) {
  delete newMessage.id;
  const result = await sql.query(`INSERT INTO ${this.schema}.message (description, parentid,createdbyid, lastmodifiedbyid)  VALUES ($1, $2, $3, $4) RETURNING *`,
    [newMessage.description, newMessage.parentid, userid, userid]);
  if (result.rows.length > 0) {
    return {
      id: result.rows[0].id,
      ...newMessage
    };
  }
  return null;
};

/** user message alert create */
async function createUserMsgAlert(newMessage, userid, schema) {
  delete newMessage.id;
  let result = [];
  newMessage.result.forEach(function (msg) {
    let userMsgData = sql.query(`INSERT INTO ${schema}.usermessagealert (messageid, userid,status,createdbyid, lastmodifiedbyid)  VALUES ($1, $2, $3, $4,$5) RETURNING *`,
      [msg.messageId, msg.userId, msg.status, userid, userid])
  })
  return 'Successfully';
};

async function findById(id) {
  const result = await sql.query(`SELECT * FROM ${this.schema}.message WHERE id = $1`, [id]);
  if (result.rows.length > 0)
    return result.rows[0];

  return null;
};


async function findAll(title) {
  let query = `SELECT *, concat(ow.firstname, ' ' , ow.lastname) ownername FROM ${this.schema}.message`;
  query += " INNER JOIN public.user ow ON ow.id = ownerid ";

  if (title) {
    query += ` WHERE title LIKE '%${title}%'`;
  }

  query += " ORDER BY createddate DESC ";

  const result = await sql.query(query);
  return result.rows;
};

async function findAllMeetings(userinfo, today) {
  let query = `SELECT *, concat(ow.firstname, ' ' , ow.lastname) ownername FROM ${this.schema}.message`;
  query += " INNER JOIN public.user ow ON ow.id = ownerid ";

  if (today) {
    query += ` WHERE type = 'Meeting' AND startdatetime::date = now()::date AND ownerid = $1`;
  } else {
    query += ` WHERE type = 'Meeting' AND ownerid = $1`;
  }
  query += " ORDER BY createddate DESC ";
  const result = await sql.query(query, [userinfo.id]);
  return result.rows;
};

async function findAllToday() {
  let query = `SELECT *, concat(ow.firstname, ' ' , ow.lastname) ownername FROM ${this.schema}.message`;
  query += " INNER JOIN public.user ow ON ow.id = ownerid ";
  query += ` WHERE createddate::date = now()::date`;
  query += " ORDER BY createddate DESC ";
  const result = await sql.query(query);
  return result.rows;
};

// 13-07-2023 
async function findAllUnread(userid) {
  let query = `select msgalert.*, message.description, TO_CHAR(msgalert.createddate, 'DD Mon, YYYY') date `;
  query += ` , concat(cu.firstname, ' ' , cu.lastname) createdbyname `;
  query += `from ${this.schema}.usermessagealert msgalert `;

  query += `inner join ${this.schema}.message  on `;
  query += `msgalert.messageid = message.id  inner join public.user  cu ON cu.Id = msgalert.createdbyid `;
  query += `where msgalert.userid = '${userid}' and `;
  query += `msgalert.status  = 'Unread'`;
  /*let query = `SELECT tsk.*, TO_CHAR(tsk.createddate, 'DD Mon, YYYY') date,`;
  query += " concat(cu.firstname, ' ' , cu.lastname) createdbyname ";
  query += ` FROM ${this.schema}.message tsk `;
  query += " INNER JOIN public.user cu ON cu.Id = tsk.createdbyid ";*/
  try {
    const result = await sql.query(query);
    if (result.rows.length > 0) {
      return result.rows;
    }
  } catch (error) {
    console.log('ERROR:', error);
  }
  return null;
};

async function findAllOpen(userinfo) {
  let query = `SELECT t.*, concat(ow.firstname, ' ' , ow.lastname) ownername FROM ${this.schema}.message t `;
  query += " INNER JOIN public.user ow ON ow.id = ownerid ";

  query += ` WHERE status in ('Not Started', 'In Progress' , 'Waiting') AND extract (month from createddate) >= extract(month from now()) - 1 AND     extract (year from createddate) >= extract(year from now())`;

  if (userinfo.userrole === 'USER') {
    query += ` AND ownerid = $1 `;
    query += " ORDER BY createddate DESC ";
    const result = await sql.query(query, [userinfo.id]);
    return result.rows;
  } else {
    query += " ORDER BY createddate DESC ";
    const result = await sql.query(query);
    return result.rows;
  }
};

async function updateById(id, newtMessage, userid) {
  delete newtMessage.id;
  newtMessage['lastmodifiedbyid'] = userid;
  const query = buildUpdateQuery(id, newtMessage, this.schema);
  // Turn req.body into an array of values
  var colValues = Object.keys(newtMessage).map(function (key) {
    return newtMessage[key];
  });

  const result = await sql.query(query, colValues);
  if (result.rowCount > 0) {
    return {
      "id": id,
      ...newtMessage
    };
  }
  return null;



};

async function deleteMessage(id) {
  const result = await sql.query(`DELETE FROM ${this.schema}.message WHERE id = $1`, [id]);

  if (result.rowCount > 0)
    return "Success"
  return null;
};

function buildUpdateQuery(id, cols, schema) {
  // Setup static beginning of query
  var query = [`UPDATE ${schema}.message`];
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

async function findByParentId(pid) {
  let query = `SELECT tsk.*, TO_CHAR(tsk.createddate, 'DD Mon, YYYY') date,`;
  query += " concat(cu.firstname, ' ' , cu.lastname) createdbyname ";
  query += ` FROM ${this.schema}.message tsk `;
  query += " INNER JOIN public.user cu ON cu.Id = tsk.createdbyid ";
  try {
    const result = await sql.query(query + " WHERE tsk.parentid = $1 ORDER BY CREATEDDATE DESC", [pid]);
    if (result.rows.length > 0)
      return result.rows;
  } catch (error) {
    console.log('ERROR:', error);
  }


  return null;
};

//13-07-2023
async function findUnreadMessageById(id) {
  const result = await sql.query(`SELECT * FROM ${this.schema}.usermessagealert WHERE id = $1`, [id]);
  if (result.rows.length > 0)
    return result.rows[0];

  return null;
};

//13-07-2023
async function updateUnreadMessageById(id, userid) {
  const query = `UPDATE ${this.schema}.usermessagealert SET "status" = 'Read', "lastmodifiedbyid" = $2 WHERE "id" = $1`;
  const result = await sql.query(query, [id, userid]);
  if (result.rowCount > 0) {
    return {
      "id": id
    };
  }
  return null;
};

module.exports = {
  findById,
  updateById,
  findAll,
  create,
  deleteMessage,
  init,
  findByParentId,
  findAllOpen,
  findAllToday,
  findAllMeetings,
  findAllUnread,
  findUnreadMessageById,
  updateUnreadMessageById,
  createUserMsgAlert
};