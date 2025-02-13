/**
 * @author      Abdul Pathan
 * @date        Aug, 2024
 * @copyright   www.ibirdsservices.com
 */

const sql = require("./db.js");
const moment = require("moment-timezone");
let schema = '';

async function init(schema_name) {
    console.log("init", schema_name)

    this.schema = schema_name;
}

async function findById(id) {
    let query = `SELECT * FROM ${this.schema}.whatsapp_setting `;
    const result = await sql.query(query + ` WHERE id = $1`, [id]);

    return result.rows.length > 0 ? result.rows[0] : null;
}
// ADded by shivani 19 

async function getAllWhatsAppSetting(userinfo) {
console.log("userinfo",userinfo)
    let query = `SELECT wh.* FROM ${this.schema}.whatsapp_setting wh`
    query += " INNER JOIN public.user cu ON cu.Id = wh.createdbyid ";
    query += " INNER JOIN public.user mu ON mu.Id = wh.lastmodifiedbyid ";

    let result = null;
    if (userinfo.userrole === 'ADMIN') {
        query += " WHERE (wh.createdbyid = $1 OR wh.createdbyid in (SELECT id FROM public.user team where managerid = $1)) "
        result = await sql.query(query, [userinfo.id]);
    }else if(userinfo.userrole === 'USER' ){
        query += " WHERE wh.phone = ANY($1::text[]) ";
        result = await sql.query(query, [userinfo.whatsapp_settings]);    
    }
    else {
        // query += " WHERE wh.phone = $1 "
        result = await sql.query(query);
    }
    return result.rows.length > 0 ? result.rows : null;
};

// Changed by shivani mehra
// async function getWhatsAppSettingData(userinfo, business_number) {

//     let query = `SELECT wh.* FROM ${this.schema}.whatsapp_setting wh`
//     query += " INNER JOIN public.user cu ON cu.Id = wh.createdbyid ";
//     query += " INNER JOIN public.user mu ON mu.Id = wh.lastmodifiedbyid ";

//     let result = null;
 
//         query += " WHERE wh.phone = $1 "
//         result = await sql.query(query, [business_number]);
//     return result.rows.length > 0 ? result.rows : null;
// };


async function createRecord(reqBody, userid) {
    try {
        const { name, app_id, access_token, business_number_id, whatsapp_business_account_id, end_point_url, phone } = reqBody;
        const result = await sql.query(`INSERT INTO ${this.schema}.whatsapp_setting (name, app_id, access_token, business_number_id, whatsapp_business_account_id, end_point_url, phone, createdbyid, lastmodifiedbyid)  VALUES ($1, $2, $3, $4, $5, $6, $7, $8,$9) RETURNING *`,
            [name, app_id, access_token, business_number_id, whatsapp_business_account_id, end_point_url, phone, userid, userid]);

            if (result.rows.length > 0) {
                const insertedRecord = result.rows[0];
                const tenantResult = await sql.query(
                    `INSERT INTO public.tenant_whatsapp_setting 
                    (whatsapp_setting_id, tenantcode, phone, createdbyid, lastmodifiedbyid) 
                    VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                    [insertedRecord.id, this.schema, phone, userid, userid]
                );
    
                if (tenantResult.rows.length > 0) {
                    return insertedRecord; // Return the record from whatsapp_setting
                } else {
                    console.log('Failed to insert into tenant_whatsapp_setting');
                    return null;
                }
            }

            
        // return result.rows.length > 0 ? result.rows[0] : null;

    } catch (error) {
        console.log('##ERROR', error);
    }
    return null;
}

async function updateById(id, wh_Record, userid) {

    wh_Record['lastmodifiedbyid'] = userid;

    const query = buildUpdateQuery(id, wh_Record, this.schema);

    var colValues = Object.keys(wh_Record).map(function (key) {
        return wh_Record[key];
    });

    const result = await sql.query(query, colValues);
    return result.rowCount > 0 ? { "id": id, ...wh_Record } : null;
};

function buildUpdateQuery(id, cols, schema) {
    var query = [`UPDATE ${schema}.whatsapp_setting`];
    query.push('SET');

    var set = [];
    Object.keys(cols).forEach(function (key, i) {
        set.push(key + ' = ($' + (i + 1) + ')');
    });

    query.push(set.join(', '));
    query.push('WHERE id = \'' + id + '\'');
    return query.join(' ');
}


// async function getWhatsAppSettingData(whatsappNumber) {
//     console.log('### whatsappNumber', whatsappNumber);

//     let query = `SELECT wh.* FROM ibs_whatsapp.whatsapp_setting wh`
//     query += " INNER JOIN public.user cu ON cu.Id = wh.createdbyid ";
//     query += " INNER JOIN public.user mu ON mu.Id = wh.lastmodifiedbyid ";
//     query += " WHERE wh.phone = ${whatsappNumber}' LIMIT 1"
//     // query += " WHERE wh.phone = '9530444240' LIMIT 1"

//     result = await sql.query(query);

//     return result.rows.length > 0 ? result.rows : null;
// };


async function updateSettingStatus(settingid, userid) {
    try {

        await sql.query(
            `UPDATE ${this.schema}.whatsapp_setting 
             SET status = 'false' 
             WHERE lastmodifiedbyid = $1`,
            [userid]
        );
    
        const result = await sql.query(
            `UPDATE ${this.schema}.whatsapp_setting 
             SET status = 'true', lastmodifiedbyid = $2 
             WHERE id = $1`,
            [settingid, userid]
        );

        return { rowCount: result.rowCount };
    } catch (error) {
        throw new Error('Database query failed');
    }
}


async function getWhatsAppSettingData(whatsappNumber) {
console.log("schema_name this.schema", this.schema)
    let query = `
        SELECT wh.* 
        FROM ${this.schema}.whatsapp_setting wh
        WHERE wh.phone = $1 LIMIT 1
    `;

    const result = await sql.query(query, [whatsappNumber]);
    return result.rows.length > 0 ? result.rows[0] : null;
};

async function getTenantCodeByPhoneNumber(whatsappNumber) {

    let query = `
        SELECT wh.* 
        FROM public.tenant_whatsapp_setting wh
        WHERE wh.phone = $1 LIMIT 1
    `;

    const result = await sql.query(query, [whatsappNumber]);
    return result.rows.length > 0 ? result.rows[0] : null;
};

async function getCount() {

    let query = `SELECT COUNT(*) FROM ${this.schema}.whatsapp_setting`;

    // Execute the query and get the result
    const result = await sql.query(query);

    // Return the count of records
    return parseInt(result.rows[0].count);
}


async function getPlatformData(createdbyid) {
    let query = `
        SELECT c.platform_name, c.platform_api_endpoint 
        FROM public."user" u
        JOIN public.company c ON u.companyid = c.id
        WHERE u.id = $1
        LIMIT 1
    `;

    const result = await sql.query(query, [createdbyid]);
    return result.rows.length > 0 ? result.rows[0] : null;
}


async function getWhatsAppSettingRecord(schemaName, phoneNumber) {

    const name = schemaName;
    console.log("schemaName, phoneNumber",schemaName, phoneNumber);
    try {
        await init(name);
        const tokenAccess = await getWhatsAppSettingData(phoneNumber);
        return tokenAccess;
    } catch (error) {
        console.error('Error getting WhatsApp settings:', error.message);
        throw error;
    }
}


async function getWhatsupBillingCost(phoneNumber, startDate=null, endDate=null) {

    var sDate = '';
    var eDate = '';

    if(!(startDate && endDate)) {
        let firstdate = moment().tz("Asia/Kolkata").startOf('month');
        const lastdate = moment().tz("Asia/Kolkata").endOf('month');
        sDate = firstdate.unix();
        eDate = lastdate.unix();
    }else{
        sDate = startDate;
        eDate = endDate;
    }

    const { access_token: whatsapptoken, end_point_url, whatsapp_business_account_id } = await getWhatsAppSettingRecord(this.schema, phoneNumber);
    // const url = `${end_point_url}${whatsapp_business_account_id}/message_templates`;
    
    const url = `https://graph.facebook.com/v22.0/${whatsapp_business_account_id}?fields=conversation_analytics.start(${sDate}).end(${eDate}).granularity(DAILY).phone_numbers([]).dimensions(["CONVERSATION_CATEGORY","CONVERSATION_TYPE","COUNTRY","PHONE"])&access_token=${whatsapptoken}`

    try {
        let response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${whatsapptoken}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to upload image: ${response.statusText} - ${errorText}`);
        }

        return await response.json();

    } catch (error) {
        console.error('Error during message sending:', error);
        throw new Error(error.message);
    }
}


module.exports = { getAllWhatsAppSetting, getWhatsAppSettingData, createRecord, updateById, findById,updateSettingStatus, getTenantCodeByPhoneNumber, getCount, getPlatformData, getWhatsupBillingCost, init };