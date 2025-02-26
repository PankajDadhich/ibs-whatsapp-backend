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

async function findById(id) {
    let query = `SELECT * FROM ${this.schema}.campaign `;
    const result = await sql.query(query + ` WHERE id = $1`, [id]);

    return result.rows.length > 0 ? result.rows[0] : null;
}

    async function getRecords(userinfo, business_number) {
        let query = `SELECT 
                            c.id AS campaign_id,
                            c.name AS campaign_name,
                            c.template_name AS template_name,
                            c.type AS campaign_type,
                            c.status AS campaign_status,
                            c.start_date AS start_date,
                            c.createdbyid,
                            c.business_number,
                            json_agg(
                            CASE 
                                WHEN gp.id IS NOT NULL THEN json_build_object('id', gp.id, 'name', gp.name)
                                ELSE NULL
                            END
                        ) FILTER (WHERE gp.id IS NOT NULL) AS groups, 
                            f.id AS file_id,
                            f.title AS file_title,
                            f.filetype AS file_type,
                            f.filesize AS file_size,
                            f.description AS file_description
                        FROM 
                            ${this.schema}.campaign AS c
                        LEFT JOIN LATERAL (
                            SELECT unnest(c.group_ids::uuid[]) AS group_idsss
                        ) AS unnested_groups ON true
                        LEFT JOIN 
                            ${this.schema}.groups AS gp
                        ON 
                            unnested_groups.group_idsss = gp.id
                        LEFT JOIN 
                            ${this.schema}.file AS f
                        ON 
                            c.id = f.parentid
                    `;

        query += ` INNER JOIN ${this.schema}.user cu ON cu.Id = c.createdbyid `;
        query += ` INNER JOIN ${this.schema}.user mu ON mu.Id = c.lastmodifiedbyid `;


        let result = null;
        if (userinfo.userrole === 'USER' || userinfo.userrole === 'ADMIN') {
            query += ` WHERE (c.createdbyid = $1 OR c.createdbyid IN (SELECT id FROM ${this.schema}.user team where managerid = $1)) AND c.business_number = $2 `;
            query += `GROUP BY  c.id, c.name, c.template_name, c.type, c.status, c.start_date,  c.createdbyid, f.id, f.title, f.filetype, f.filesize, f.description`;
            query += " ORDER BY c.createddate DESC ";
            result = await sql.query(query, [userinfo.id,business_number]);
        } else {
            query += "WHERE c.business_number = $1 ";
            query += `GROUP BY c.id, c.name, c.template_name, c.type, c.status, c.start_date, c.createdbyid, f.id, f.title, f.filetype, f.filesize, f.description`;
            query += " ORDER BY c.createddate DESC ";
            result = await sql.query(query, [business_number]);
        }
        return result.rows.length > 0 ? result.rows : null;
    }



async function createRecord(reqBody, userid) {
    try {
        const { name, type, status, template_name, startDate, group_ids,business_number } = reqBody;
        const result = await sql.query(`INSERT INTO ${this.schema}.campaign (name, type, status, template_name, start_date, group_ids,business_number, createdbyid, lastmodifiedbyid)  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [name, type, status, template_name, startDate, group_ids,business_number, userid, userid]);

        return result.rows.length > 0 ? result.rows[0] : null;

    } catch (error) {
        console.log('##ERROR', error);
    }
}


async function updateById(id, campaignRecord, userid) {

    campaignRecord['lastmodifiedbyid'] = userid;

    const query = buildUpdateQuery(id, campaignRecord, this.schema);
    var colValues = Object.keys(campaignRecord).map(function (key) {
        return campaignRecord[key];
    });

    const result = await sql.query(query, colValues);
    return result.rowCount > 0 ? { "id": id, ...campaignRecord } : null;
};

function buildUpdateQuery(id, cols, schema) {
    var query = [`UPDATE ${schema}.campaign`];
    query.push('SET');

    var set = [];
    Object.keys(cols).forEach(function (key, i) {
        set.push(key + ' = ($' + (i + 1) + ')');
    });

    query.push(set.join(', '));
    query.push('WHERE id = \'' + id + '\'');
    return query.join(' ');
}

async function createparamsRecord(reqBody, userid) {
    try {
        const { campaign_id, body_text_params, msg_history_id, file_id, whatsapp_number_admin } = reqBody;
        const result = await sql.query(`INSERT INTO ${this.schema}.campaign_template_params(
     campaign_id, body_text_params, msg_history_id, file_id, whatsapp_number_admin)
    VALUES ($1, $2, $3, $4, $5)  RETURNING *`,[ campaign_id, body_text_params, msg_history_id, file_id, whatsapp_number_admin ]);
console.log("result.rows[0]->",result.rows[0]);

        return result.rows.length > 0 ? result.rows[0] : null;

    } catch (error) {
        console.log('##ERROR', error);
    }
}
async function getparamsRecord(id) {
    try {        
        const result = await sql.query(`SELECT id, campaign_id, body_text_params, msg_history_id, file_id, whatsapp_number_admin
    FROM ${this.schema}.campaign_template_params where campaign_id = $1 or msg_history_id =$1`,[id]);

        return result.rows.length > 0 ? result.rows[0] : null;

    } catch (error) {
        console.log('##ERROR', error);
    }
}


module.exports = { findById, getRecords, createRecord, updateById, init, createparamsRecord,getparamsRecord };