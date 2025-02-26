const sql = require("./db.js");

let schema = '';
function init(schema_name) {
    this.schema = schema_name;
}

async function getRecords(recordType, textName, cityName, userinfo) {
    let query = '';
    let conditions = [];
    let params = [];
    let paramIndex = 1;

    switch (recordType) {
        // case 'lead':
        //     query = `SELECT id, concat(ld.firstname, ' ' , ld.lastname) contactname, city, whatsapp_number 
        //              FROM ${this.schema}.lead ld 
        //              WHERE whatsapp_number IS NOT NULL AND blocked = false AND whatsapp_number != '' `;

        //              if (userinfo && userinfo.id ) {
        //                 conditions.push(`(   AND ld.createdbyid IS NOT NULL AND ld.lastmodifiedbyid IS NOT NULL AND ld.ownerid IS NOT NULL AND ld.createdbyid = $${paramIndex}  OR ld.createdbyid IN (  SELECT id FROM public.user team WHERE managerid =  $${paramIndex}) OR  ld.ownerid =  $${paramIndex} )`);
        //                 params.push(userinfo.id);
        //                 paramIndex++;
        //             }

        //     if (textName) {
        //         conditions.push(`(LOWER(ld.firstname) LIKE LOWER($${paramIndex}) OR LOWER(ld.lastname) LIKE LOWER($${paramIndex}))`);
        //         params.push(`%${textName}%`);
        //         paramIndex++;
        //     }
        //     if (cityName) {
        //         conditions.push(`LOWER(ld.city) = LOWER($${paramIndex})`);
        //         params.push(cityName);
        //         paramIndex++;
        //     }
        //     break;
        case 'lead':
    query = `SELECT id, concat(ld.firstname, ' ' , ld.lastname) contactname, city, whatsapp_number 
             FROM ${this.schema}.lead ld 
             WHERE whatsapp_number IS NOT NULL AND blocked = false AND whatsapp_number != '' `;

    // Check if userinfo and user ID is available
    if (userinfo && userinfo.id) {
        conditions.push(`(   ld.createdbyid IS NOT NULL AND ld.lastmodifiedbyid IS NOT NULL AND ld.ownerid IS NOT NULL 
                          AND (ld.createdbyid = $${paramIndex} OR ld.createdbyid IN (SELECT id FROM ${this.schema}.user team WHERE managerid = $${paramIndex}) 
                          OR ld.ownerid = $${paramIndex}) )`);
        params.push(userinfo.id);
        paramIndex++;
    }

    // Add condition for textName
    if (textName) {
        conditions.push(`(LOWER(ld.firstname) LIKE LOWER($${paramIndex}) OR LOWER(ld.lastname) LIKE LOWER($${paramIndex}))`);
        params.push(`%${textName}%`);
        paramIndex++;
    }

    // Add condition for cityName
    if (cityName) {
        conditions.push(`LOWER(ld.city) = LOWER($${paramIndex})`);
        params.push(cityName);
        paramIndex++;
    }

    // Add conditions to the query if they exist
    if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ');
    }

    break;

        case 'user':
            query = `SELECT id, concat(usr.firstname, ' ' , usr.lastname) contactname, whatsapp_number 
                         FROM ${this.schema}.user usr 
                         WHERE whatsapp_number IS NOT NULL AND blocked = false AND whatsapp_number != '' `;

            if (textName) {
                conditions.push(`(LOWER(usr.firstname) LIKE LOWER($${paramIndex}) OR LOWER(usr.lastname) LIKE LOWER($${paramIndex}))`);
                params.push(`%${textName}%`);
                paramIndex++;
            }

            if (userinfo && userinfo.id && (userinfo.userrole === 'USER' || userinfo.userrole === 'ADMIN')) {
                conditions.push(`(usr.managerid = $${paramIndex})`);
                params.push(userinfo.id);
                paramIndex++;
            }
            break;

        case 'contact':
            query = `SELECT id, concat(ct.firstname, ' ' , ct.lastname) contactname, city, whatsapp_number 
                     FROM ${this.schema}.contact ct 
                     WHERE whatsapp_number IS NOT NULL AND blocked = false AND whatsapp_number != '' `;

            if (textName) {
                conditions.push(`(LOWER(ct.firstname) LIKE LOWER($${paramIndex}) OR LOWER(ct.lastname) LIKE LOWER($${paramIndex}))`);
                params.push(`%${textName}%`);
                paramIndex++;
            }
            if (cityName) {
                conditions.push(`LOWER(ct.city) = LOWER($${paramIndex})`);
                params.push(cityName);
                paramIndex++;
            }
            break;

        case 'recentlyMessage':
            query = `SELECT mh.id,
                        mh.parent_id, 
                        mh.name AS contactname, 
                        mh.whatsapp_number, 
                        mh.createddate
                     FROM 
                        ${this.schema}.message_history mh
                     INNER JOIN (
                        SELECT 
                            whatsapp_number, 
                            MAX(createddate) AS recent_createddate
                        FROM 
                            ${this.schema}.message_history
                        WHERE 
                            recordtypename != 'campaign' AND recordtypename != 'groups'
                        GROUP BY 
                            whatsapp_number
                     ) recent_msgs ON mh.whatsapp_number = recent_msgs.whatsapp_number 
                     AND mh.createddate = recent_msgs.recent_createddate
                     WHERE mh.whatsapp_number IS NOT NULL AND mh.whatsapp_number != '' `;

            if (textName) {
                conditions.push(`LOWER(mh.name) LIKE LOWER($${paramIndex})`);
                params.push(`%${textName}%`);
                paramIndex++;
            }

            if (userinfo && userinfo.id && (userinfo.userrole === 'USER' || userinfo.userrole === 'ADMIN')) {
                conditions.push(`mh.createdbyid = $${paramIndex} OR mh.createdbyid IN (SELECT id FROM ${this.schema}.user team WHERE managerid = $${paramIndex})`);
                params.push(userinfo.id);
                paramIndex++;
            }

            if (conditions.length > 0) {
                query += ` AND ${conditions.join(' AND ')}`;
            }

            query += ` ORDER BY recent_msgs.recent_createddate DESC LIMIT 10`;
            break;

        case 'groups':
            query = `SELECT id, name as contactname
                     FROM ${this.schema}.groups 
                     WHERE status = true `;

            if (textName) {
                conditions.push(`LOWER(name) LIKE LOWER($${paramIndex})`);
                params.push(`%${textName}%`);
                paramIndex++;
            }
            break;

        default:
            return [];
    }

    if ((recordType === 'lead' && userinfo.userrole === 'USER' )) {
        query += `OR ld.ownerid = $${paramIndex}`;
    }


    // if ((recordType !== 'user' && recordType !== 'recentlyMessage') && (userinfo.userrole === 'USER' || userinfo.userrole === 'ADMIN')) {
    //     conditions.push(`createdbyid = $${paramIndex} OR createdbyid IN (SELECT id FROM ${this.schema}.user team WHERE managerid = $${paramIndex})`);
    //     params.push(userinfo.id);
    //     paramIndex++;
    // }
   

    if (recordType !== 'recentlyMessage' && conditions.length > 0) {
        query += ` AND ${conditions.join(' AND ')}`;
    }

   

    if (recordType !== 'recentlyMessage' && recordType !== 'user') {
        query += ` ORDER BY createddate DESC`;
    }
    if (recordType !== 'recentlyMessage' && !cityName) {
        query += ` LIMIT 100`;
    }

    const result = await sql.query(query, params);
    return result.rows;
}



async function getUnreadMsgCounts(userid, business_number) {
    let query = `
            SELECT  whatsapp_number, COUNT(id) AS unread_msg_count
            FROM ${this.schema}.message_history
            WHERE is_read = false  AND status = 'Incoming' AND createdbyid = $1 AND business_number = $2
            GROUP BY whatsapp_number 
        `;

    try {
        const result = await sql.query(query, [userid, business_number]);
        return result.rows.length > 0 ? result.rows : null;

    } catch (error) {
        console.log('Error executing query', error);
        throw error;
    }
};

async function markAsRead(whatsapp_number, userid, business_number) {
    let query = `
       UPDATE ${this.schema}.message_history
        SET is_read = true, lastmodifiedbyid = $2
        WHERE whatsapp_number = $1  AND status = 'Incoming' AND is_read = false  AND createdbyid =  $2 AND business_number =$3
    `;

    try {
        const result = await sql.query(query, [whatsapp_number, userid,business_number]);
        return result.rowCount > 0;
    } catch (error) {
        console.log('Error executing query', error);
        throw error;
    }
}

module.exports = {
    getRecords,
    getUnreadMsgCounts, markAsRead,
    init
};
