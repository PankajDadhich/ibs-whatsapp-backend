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

async function createRecords(body, userid) {
    try {
        const { id, name, language, category, header, header_body, message_body, example_body_text, footer, buttons, business_number } = body;
        const buttonsJson = JSON.stringify(buttons);

        const result = await sql.query(`INSERT INTO ${this.schema}.message_template ( template_id, template_name, language, category, header, header_body, message_body, example_body_text, footer, buttons,business_number, createdbyid, lastmodifiedbyid )  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
            [id, name, language, category, header, header_body, message_body, example_body_text, footer, buttonsJson, business_number, userid, userid]);

        return result.rows.length > 0 ? result.rows[0] : null;

    } catch (error) {
        console.log('##ERROR', error);
    }
    return null;
}

async function findRecord(body) {
    try {
        const { id, name } = body;
        const query = `SELECT * FROM ${this.schema}.message_template WHERE template_id = '${id}' AND template_name = '${name}' `;
        let result = await sql.query(query);
        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('##ERROR', error);
    }
}



async function updateById(id, reqBody, userid) {
    reqBody['lastmodifiedbyid'] = userid;
    const query = buildUpdateQuery(id, reqBody, this.schema);
    var colValues = Object.keys(reqBody).map(function (key) {
        return reqBody[key];
    });
    const result = await sql.query(query, colValues);
    if (result.rowCount > 0) {
        return { "id": id, ...reqBody };
    }
    return null;
};


function buildUpdateQuery(id, cols, schema) {
    var query = [`UPDATE ${schema}.message_template`];
    query.push('SET');
    var set = [];
    Object.keys(cols).forEach(function (key, i) {
        set.push(key + ' = ($' + (i + 1) + ')');
    });
    query.push(set.join(', '));
    query.push('WHERE id = \'' + id + '\'');
    return query.join(' ');
}


module.exports = { createRecords, findRecord, updateById, init };