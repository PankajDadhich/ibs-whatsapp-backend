const sql = require("./db.js");
const Sharing = require("./sharing.model.js");

let schema = '';
function init(schema_name) {
    this.schema = schema_name;
}


//...... Fetch All Leads .........................
async function findAll(userinfo) {
    let query = `SELECT acc.*, 
                        concat(acc.firstname, ' ', acc.lastname) AS leadname, 
                        concat(ow.firstname, ' ', ow.lastname) AS ownername, 
                        concat(cu.firstname, ' ', cu.lastname) AS createdbyname, 
                        concat(mu.firstname, ' ', mu.lastname) AS lastmodifiedbyname 
                 FROM ${this.schema}.lead acc`;

    query += ` LEFT JOIN ${this.schema}.user cu ON cu.Id = acc.createdbyid `;
    query += ` LEFT JOIN ${this.schema}.user mu ON mu.Id = acc.lastmodifiedbyid `;
    query += ` LEFT JOIN ${this.schema}.user ow ON ow.Id = acc.ownerid `;

    let result = null;

    if (userinfo.userrole === 'USER' || userinfo.userrole === 'ADMIN') {

        query += ` WHERE acc.createdbyid IS NOT NULL AND acc.lastmodifiedbyid IS NOT NULL AND acc.ownerid IS NOT NULL AND acc.createdbyid = $1  OR acc.createdbyid IN (  SELECT id FROM ${this.schema}.user team WHERE managerid = $1) OR  acc.ownerid = $1 `;
        query += " ORDER BY acc.createddate DESC ";
        result = await sql.query(query, [userinfo.id]);
    } else {
        query += " ORDER BY acc.createddate DESC ";
        result = await sql.query(query);
    }

    return result.rows;
}

//.......... Fetch Lead By Id .............
async function findById(id) {
    let query = `SELECT acc.*, concat(acc.firstname, ' ', acc.lastname) AS contactname, concat(mu.firstname, ' ' , mu.lastname) lastmodifiedbyname, concat(ow.firstname, ' ' , ow.lastname) ownername, ow.email owneremail FROM ${this.schema}.lead acc `;
    query += ` INNER JOIN ${this.schema}.user cu ON cu.id = acc.createdbyid `;
    query += ` INNER JOIN ${this.schema}.user mu ON mu.id = acc.lastmodifiedbyid `;
    query += ` LEFT JOIN ${this.schema}.user ow ON ow.id = acc.ownerid `;
    const result = await sql.query(query + ` WHERE acc.id = $1`, [id]);
    if (result.rows.length > 0)
        return result.rows[0];
    return null;
};


//................ Create Lead ................
async function create(newLead, userid) {
    delete newLead.id;
    const result = await sql.query(`INSERT INTO ${this.schema}.lead (firstname, lastname, ownerid, company, leadsource, leadstatus, rating, salutation,  email, fax,  industry, title, street, city, state, country, zipcode, description, blocked, createdbyid, lastmodifiedbyid, lostreason, amount, paymentmodel, paymentterms, iswon, whatsapp_number)  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27) RETURNING *`,
        [newLead.firstname, newLead.lastname, newLead.ownerid, newLead.company, newLead.leadsource, newLead.leadstatus, newLead.rating,
        newLead.salutation, newLead.email, newLead.fax, newLead.industry, newLead.title,
        newLead.street, newLead.city, newLead.state, newLead.country, newLead.zipcode, newLead.description, newLead.blocked,
            userid, userid, newLead.lostreason, newLead.amount, newLead.paymentmodel, newLead.paymentterms, newLead.iswon, newLead.whatsapp_number]);
    if (result.rows.length > 0) {
        return { id: result.rows[0].id, ...newLead };
    }
    return null;
};

//......... Update Lead .......................
async function updateById(id, newLead, userid) {
    delete newLead.id;
    newLead['lastmodifiedbyid'] = userid;
    const query = buildUpdateQuery(id, newLead, this.schema);
    // Turn req.body into an array of values
    var colValues = Object.keys(newLead).map(function (key) {
        return newLead[key];
    });
    try {
        const result = await sql.query(query, colValues);
        if (result.rowCount > 0) {
            return { "id": id, ...newLead };
        }
    } catch (error) {
        console.log('error:', error);
    }

    return null;
};


//.......... Delete Lead ..............................
async function deleteLead(id) {
    const result = await sql.query(`DELETE FROM ${this.schema}.lead WHERE id = $1`, [id]);
    if (result.rowCount > 0) {
        const checkGroupMemberQuery = `SELECT * FROM ${this.schema}.group_members WHERE member_id = $1`;
        const checkResult = await sql.query(checkGroupMemberQuery, [id]);
        if (checkResult.rows.length > 0) {
            const deleteGroupMemberQuery = `DELETE FROM ${this.schema}.group_members WHERE member_id = $1`;
            await sql.query(deleteGroupMemberQuery, [id]);
        }
        return "Success"
    }
    return null;
};

//.......... Duplicate Whatsapp Check.............
async function checkWhatsAppNumberExists(whatsapp_number, userid, leadId = null) {
    let query = `
        SELECT COUNT(*) FROM (
            SELECT whatsapp_number FROM ${this.schema}.user WHERE whatsapp_number = $1
            UNION ALL
            SELECT whatsapp_number FROM ${this.schema}.lead WHERE whatsapp_number = $1 AND createdbyid = $2
            ${leadId ? `AND id != $3` : ''}
        ) AS combined
    `;

    const values = leadId ? [whatsapp_number, userid, leadId] : [whatsapp_number, userid];

    try {
        const result = await sql.query(query, values);
        return result.rows[0].count > 0;
    } catch (error) {
        console.error("Error checking WhatsApp number existence:", error);
        throw error;
    }
}


function buildUpdateQuery(id, cols, schema) {
    var query = [`UPDATE ${schema}.lead`];
    query.push('SET');

    var set = [];
    Object.keys(cols).forEach(function (key, i) {
        set.push(key + ' = ($' + (i + 1) + ')');
    });
    query.push(set.join(', '));
    query.push('WHERE id = \'' + id + '\'');
    return query.join(' ');
}




module.exports = { findById, updateById, findAll, create, deleteLead, init, checkWhatsAppNumberExists };