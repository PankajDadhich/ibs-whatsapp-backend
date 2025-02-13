/**
 * @author      Shivani Mehra
 * @date        Nov, 2024
 * @copyright   www.ibirdsservices.com
 */

const sql = require("./db.js");

let schema = '';
function init(schema_name) {
    this.schema = schema_name;
}
async function getAllRecords(status) {
    let query = `SELECT module.* FROM public.module `;
    let params = [];

    if (status) {
        query += "WHERE status = $1 ";
        params.push(status);
    }

    query += "ORDER BY module.order_no";

    let result = await sql.query(query, params);

    return result.rows.length > 0 ? result.rows : null;
};


async function createRecord(reqBody) {
    const order_no = reqBody.order_no !== null ? parseInt(reqBody.order_no) : null;

    const result = await sql.query(`INSERT INTO public.module (name, status, api_name, icon, url, icon_type, order_no) VALUES ($1, $2,$3,$4,$5,$6,$7) RETURNING *`,
        [ reqBody.name, reqBody.status, reqBody.api_name, reqBody.icon, reqBody.url, reqBody.icon_type, order_no]);
        if(result.rows.length > 0){
            return result.rows[0];
        }
    return null;
};

async function updateById(id, reqBody) {
   const query = buildUpdateQuery(id, reqBody);
    var colValues = Object.keys(reqBody).map(function (key) {
        return reqBody[key];
    });
    const result = await sql.query(query, colValues);
    if (result.rowCount > 0) {
        return { "id": id, ...reqBody };
    }
    return null;
};


function buildUpdateQuery(id, cols) {
    var query = [`UPDATE public.module`];
    query.push('SET');
    var set = [];
    Object.keys(cols).forEach(function (key, i) {
        set.push(key + ' = ($' + (i + 1) + ')');
    });
    query.push(set.join(', '));
    query.push('WHERE id = \'' + id + '\'');
    return query.join(' ');
}

async function deleteRecord(id) {
    try {
            await sql.query('BEGIN');
            const moduleResult = await sql.query(
                `DELETE FROM public.module WHERE id = $1`, 
                [id]
            );
            if (moduleResult.rowCount > 0 ) {
                await sql.query('COMMIT');
                return "Success";
            }
            await sql.query('ROLLBACK');
            return null;
    }   catch (error) {
            console.error("Error during delete operation:", error);
            await sql.query('ROLLBACK');
            throw new Error('Failed to delete records');
    }
}


async function checkDuplicateRecord(name, id = null) {
    let query = `
        SELECT * 
        FROM public.module m
        WHERE m.name = $1
    `;
    const params = [name];

    if (id) {
        query += " AND m.id != $2";
        params.push(id);
    }

    const result = await sql.query(query, params);
    return result.rows.length > 0;
}

module.exports = { getAllRecords, createRecord, updateById, deleteRecord, checkDuplicateRecord, init };
