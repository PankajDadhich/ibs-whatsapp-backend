/**
 * @author      Abdul Pathan
 * @date        July, 2024
 * @copyright   www.ibirdsservices.com
 */

const sql = require("./db.js");
let schema = '';

function init(schema_name) {
    this.schema = schema_name;
}

async function getMessageHistoryRecords(toNumber,business_number) {

    const query = `
            SELECT mh.id AS message_history_id, 
                mh.*,
                mh.message AS chatMsg, 
                temp.id AS message_template_id,
                temp.template_name,
                temp.template_id,
                temp.language,
                temp.category, 
                temp.header,
                temp.header_body,
                temp.message_body,
                temp.example_body_text,
                temp.footer,
                temp.buttons,
                fl.id AS file_id,
                fl.title,
                fl.filetype,
                fl.description
            FROM 
                ${this.schema}.message_history mh
            LEFT JOIN 
                ${this.schema}.message_template temp  
            ON 
                mh.message_template_id = temp.id
            LEFT JOIN 
                ${this.schema}.file fl  
            ON  
                mh.file_id = fl.id
            WHERE 
                mh.whatsapp_number = $1 AND mh.business_number = $2
                AND (mh.status = 'Outgoing' OR mh.status = 'Incoming')
                AND mh.recordtypename != 'campaign' AND mh.recordtypename != 'groups' Order by mh.createddate asc  `;

    // ON CASE 
    // WHEN mh.file_id::text ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    // THEN mh.file_id::uuid 
    // ELSE NULL 
    // END = fl.id

    try {
        const result = await sql.query(query, [toNumber,business_number]);
        return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

async function createMessageHistoryRecord(body, userid) {
    try {
        const { parent_id, name, message_template_id, whatsapp_number, message, status, recordtypename, file_id, is_read,business_number,message_id } = body;
        const result = await sql.query(`INSERT INTO ${this.schema}.message_history (parent_id, name, message_template_id, whatsapp_number, message, status, recordtypename, file_id, is_read,business_number, message_id, createdbyid, lastmodifiedbyid )  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,$12, $13) RETURNING *`,
            [parent_id, name, message_template_id, whatsapp_number, message, status, recordtypename, file_id, is_read,business_number, message_id, userid, userid]);

        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

async function updateMessageStatus(messageId, status) {
    try {
        const result = await sql.query(`
            UPDATE ${this.schema}.message_history 
            SET delivery_status = $1
            WHERE message_id = $2
            RETURNING *
        `, [status,  messageId]);

        return result.rows.length > 0 ? result.rows[0] : null; // Return the updated record
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}


//// campaign message history download
async function getMHRecordsByCampaignId(id) {
    const query = `
        SELECT 
            mh.id, 
            mh.name,
            mh.whatsapp_number AS number, 
            mh.status, 
            mh.message, 
            mh.parent_id,
            COUNT(*) OVER () AS total_records,
            COUNT(CASE WHEN mh.status = 'Success' THEN 1 END) OVER () AS success_count,
            COUNT(CASE WHEN mh.status = 'Failed' THEN 1 END) OVER () AS failed_count
        FROM 
            ${this.schema}.message_history mh
        INNER JOIN 
            ${this.schema}.campaign cmp 
        ON  
            mh.parent_id = cmp.id
        WHERE 
            mh.recordtypename = 'campaign'
            AND cmp.id = $1
    `;

    try {
        const result = await sql.query(query, [id]);
        return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

async function getGroupHistoryRecords(id, business_number) {// temp.message AS templateMsg,

    const query = `
            SELECT 
                mh.*,
                mh.message AS chatMsg, 
                temp.id AS message_template_id,
                temp.template_name,
                temp.template_id,
                temp.language,
                temp.category, 
                temp.header,
                temp.header_body,
                temp.message_body,
                temp.example_body_text,
                temp.footer,
                temp.buttons,
                fl.id AS file_id,
                fl.title,
                fl.filetype,
                fl.description
            FROM 
                ${this.schema}.message_history mh
            LEFT JOIN 
                ${this.schema}.message_template temp  
            ON 
                mh.message_template_id = temp.id
            LEFT JOIN 
                ${this.schema}.file fl  
            ON CASE 
                WHEN mh.file_id::text ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                THEN mh.file_id::uuid 
                ELSE NULL 
                END = fl.id
            WHERE 
                mh.parent_id = $1 AND mh.business_number = $2
                AND (mh.status = 'Outgoing')
                AND mh.recordtypename = 'groups' Order by mh.createddate asc  `;

    try {
        const result = await sql.query(query, [id, business_number]);
        return result.rows.length > 0 ? result.rows : null;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}


module.exports = {
    getMessageHistoryRecords, getGroupHistoryRecords, createMessageHistoryRecord, getMHRecordsByCampaignId, updateMessageStatus,
    init
};