/**
 * @author      Abdul Pathan
 * @date        Aug, 2024
 * @copyright   www.ibirdsservices.com
 */

const sql = require("./db.js");
const { execute } = require('@getvim/execute');
const dbConfig = require("../config/db.config.js");
const fs = require('fs');
const msgHistory = require("../models/messagehistory.model.js");
const wh_Setting = require("../models/whatsappsetting.model.js");
const campaignModel = require("../models/campaign.model.js")
const webTemplateModel = require("../models/webhooktemplate.model.js");

const FormData = require('form-data');
const fetch = require('node-fetch'); // Ensure you have node-fetch installed

let schema = '';
const XLSX = require('xlsx');
const path = require('path');

function init(schema_name) {
    this.schema = schema_name;
}

const CAMPAIGN_STATUS_IN_PROGRESS = 'In Progress';
const CAMPAIGN_STATUS_PENDING = 'Pending';
const CAMPAIGN_STATUS_COMPLETED = 'Completed';


async function updateCampaignRecord(tenants) {
    try {
        const query = ` SELECT cg.*  FROM ${tenants}.campaign cg
                        INNER JOIN public.user cu ON cu.id = cg.createdbyid
                        INNER JOIN public.user mu ON mu.id = cg.lastmodifiedbyid
                        WHERE cg.status = '${CAMPAIGN_STATUS_PENDING}'
                        AND cg.start_date BETWEEN CURRENT_TIMESTAMP AND (CURRENT_TIMESTAMP + INTERVAL '1 hours')
                        LIMIT 1 `;

        const result = await sql.query(query);

        if (result.rows.length > 0) {
            const { id, createdbyid } = result.rows[0];

            await updateCampaignStatus(id, CAMPAIGN_STATUS_IN_PROGRESS, createdbyid, tenants);

            return 'Updated record successfully.';
        } else {
            return 'No records found for the given criteria.';
        }
    } catch (error) {
        console.error('Error in update campaign records:', error);
        return 'An error occurred while processing the request.';
    }
}


async function sendBulkMessage(tenants) {
    try {
        const campaignData = await fetchActiveCampaign(tenants);
        if (!campaignData) return 'Record does not exist.';
        let groupResultData = [];

        if (campaignData.group_ids && campaignData.group_ids !== '{}') {
            groupResultData = await fetchGroupMembers(campaignData.group_ids, tenants);
        }

        let data = '';
       
        if(campaignData.file_title){
            const filePath = path.join(process.env.FILE_UPLOAD_PATH, tenants, 'campaign_files', campaignData.file_title);

            if (!fs.existsSync(filePath)) {
                console.error('File does not exist:', filePath);
                return 'File does not exist.';
            }
    
             data = await readXlsmFile(filePath);
    
        }
        const arrayMerge = data && data.length > 0 ? data.concat(groupResultData) : groupResultData;
        const uniqueNumbersSet = new Set();

        const uniqueArray = arrayMerge.filter(item => {
            if (uniqueNumbersSet.has(item.Number)) {
                return false;
            }
            uniqueNumbersSet.add(item.Number);
            return true;
        });

        if (uniqueArray.length > 0) {
            await sendTemplateMessage(uniqueArray, campaignData, tenants);
        }

        await updateCampaignStatus(campaignData.campaign_id, CAMPAIGN_STATUS_COMPLETED, campaignData.createdbyid, tenants);
        return arrayMerge.length > 0 ? 'Success' : 'Failed to read data from file.';

    } catch (error) {
        console.error('Error in send Bulk Message:', error);
        return 'An error occurred while processing the request.';
    }
}


async function fetchActiveCampaign(tenants) {//   header, header_body, message_body, example_body_text, footer, buttons 
    const query = `
        SELECT 
            c.id AS campaign_id,
            c.business_number AS business_number,
            c.group_ids AS group_ids,
            c.status AS campaign_status,
            c.start_date AS start_date,
            c.createdbyid AS createdbyid,
            c.lastmodifiedbyid AS lastmodifiedbyid,
            f.id AS file_id,
            f.title AS file_title,
            mt.id AS message_template_id,
            mt.template_name,
            mt.template_id,
            mt.language AS language,
            mt.category AS category, 
            mt.header,
            mt.header_body,
            mt.message_body,
            mt.example_body_text,
            mt.footer,
            mt.buttons
        FROM 
            ${tenants}.campaign AS c
        LEFT JOIN 
            ${tenants}.file AS f ON c.id = f.parentid
        LEFT JOIN 
            ${tenants}.message_template AS mt ON c.template_name = mt.template_name
        INNER JOIN public.user cu ON cu.id = c.createdbyid
        INNER JOIN public.user mu ON mu.id = c.lastmodifiedbyid 
        WHERE 
            c.status = '${CAMPAIGN_STATUS_IN_PROGRESS}' LIMIT 1
    `;

    const result = await sql.query(query);
    return result.rows[0] || null;
}

async function fetchGroupMembers(groupIdsArray, tenants) {
    let groupIdsString = Array.isArray(groupIdsArray) ? groupIdsArray.join(',') : groupIdsArray;

    const formattedString = groupIdsString.replace(/[{}"]/g, '');
    const groupIds = formattedString.split(',').map(id => id.trim());
    const groupQuery = `
        SELECT 
            gm.id,
            COALESCE(ur.firstname, ld.firstname) AS member_firstname,
            COALESCE(ur.lastname, ld.lastname) AS member_lastname,
            COALESCE(ur.whatsapp_number, ld.whatsapp_number) AS whatsapp_number  
        FROM 
            ${tenants}.group_members gm
        LEFT JOIN 
            ${tenants}.groups grp ON gm.group_id = grp.id  
        LEFT JOIN 
            public.user ur ON gm.member_id = ur.id  
        LEFT JOIN 
            ${tenants}.lead ld ON gm.member_id = ld.id
        WHERE 
            gm.group_id IN (${groupIds.map(id => `'${id}'`).join(',')}) 
            AND grp.status = true  
    `;

    try {
        const groupResult = await sql.query(groupQuery);
        return groupResult.rows?.filter(member => member.whatsapp_number)?.map(member => ({
            Name: `${member.member_firstname} ${member.member_lastname}`,
            Number: member.whatsapp_number,
        }));
    } catch (error) {
        console.error('Error fetching group members:', error);
        throw error;
    }
}

async function readXlsmFile(filePath) {
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetNames = workbook.SheetNames;
        const firstSheetName = sheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        let data = XLSX.utils.sheet_to_json(worksheet);
        data = data.filter(row => row.Name && row.Number).map(row => {

            if (row.Number && row.Number.toString().length === 10) {
                row.Number = '91' + row.Number;
            }
            return row;
        });
        return data;
    } catch (error) {
        console.error('Error reading XLSM file:', error);
        return null;
    }
}

async function sendTemplateMessage(data, campaignData, tenants) {
    try {
        const { template_name, message_template_id, campaign_id, file_id, createdbyid , business_number} = campaignData;
        const sendMessages = data.map(async record => {
            const payload = await createMessagePayload(record, campaignData, tenants);
            return sendMessage(payload, record, campaign_id, file_id, createdbyid, template_name, message_template_id, tenants, business_number);
        });

        const results = await Promise.all(sendMessages);
    } catch (error) {
        console.error('Error in send Template Message:', error);
    }
}


async function createMessagePayload(record, campaignData, tenants) {

    let documentId = null;

    if (campaignData.header !== 'TEXT' && campaignData.header && campaignData.header_body) {
        if (campaignData.header === 'IMAGE' || campaignData.header === 'VIDEO' || campaignData.header === 'DOCUMENT') {
            documentId = await uploadWhatsAppMedia(campaignData.header, campaignData.header_body, tenants, campaignData.business_number);
        }
    }

    const reqBody = {
        messaging_product: 'whatsapp',
        to: record.Number,
        type: 'template',
        category: campaignData.category,
        template: {
            name: campaignData.template_name,
            language: {
                code: campaignData.language,
            },
            components: [
                {
                    type: "header",
                    parameters: []
                },
                {
                    type: "body",
                    parameters:
                        campaignData.message_body.includes("{{1}}") && campaignData.category !== 'AUTHENTICATION' ? [
                            {
                                type: "text",
                                text: record?.Name
                            }
                        ] : []
                }
            ]
        }
    };



    if (documentId) {
        const componentType = campaignData.header.toLowerCase();
        reqBody.template.components[0].parameters.push({
            type: componentType,
            [componentType]: { id: documentId }
        });
    }


    if (campaignData.example_body_text) {
        reqBody.template.components[1].parameters.push({
            type: "text",
            text: campaignData.example_body_text
        });
    }

    if (campaignData.example_body_text) {
        reqBody.template.components.push({
            type: "button",
            sub_type: "url",
            index: 0,
            parameters: [
                {
                    type: "text",
                    text: campaignData.example_body_text
                }
            ]
        });
    }

    return reqBody;
}

async function sendMessage(payload, record, campaign_id, file_id, createdbyid, template_name, message_template_id, tenants, business_number) {
    try {
        const tokenAccess = await getWhatsAppSettingRecord(tenants, business_number);
        const endpointURL = `${tokenAccess.end_point_url}${tokenAccess.business_number_id}/messages`;
        const response = await fetch(endpointURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenAccess.access_token}`
            },
            body: JSON.stringify(payload)
        });

        const responseBody = await response.json();
        const status = response.ok ? 'Success' : 'Failed';
        const message = response.ok ? '' : `Failed to send message: ${responseBody.error.message}`;
        const messageId = responseBody.messages[0].id;

        const newMessage = {
            parent_id: campaign_id,
            name: record.Name || '',
            whatsapp_number: record.Number,
            message: message,
            status: status,
            recordtypename: 'campaign',
            message_template_id: message_template_id, //template_name,
            file_id: file_id,
            is_read: true,
            business_number: business_number,
            message_id:messageId
        }

        await createMHistoryRecords(newMessage, createdbyid, tenants);

        console.log(`Message to ${record.Number}: ${status}`);
        return newMessage;
    } catch (error) {
        console.error(`Error sending message to ${record.Number}:`, error);
        return { status: 'Failed', error: error.message };
    }
}


async function uploadWhatsAppMedia(header, header_body, tenants, business_number) {//url, url_type, tenants

    if (!header) {
        console.error('Error during image upload: Missing URL');
        return;
    }

    try {
        const fileBlob = header === 'DOCUMENT' ? await fetchPdf(header_body) : await fetchFile(header_body);
        const fileName = header_body.split('/').pop().split('?')[0] || (header === 'DOCUMENT' ? 'file.pdf' : 'file');


        // If it's a Blob, convert it to Buffer for Node.js
        const buffer = Buffer.from(await fileBlob.arrayBuffer());

        // let file;
        // if (fileBlob instanceof Blob) {
        //     file = new File([fileBlob], fileName, { type: fileBlob.type });
        // }

        // if (fileBlob instanceof Blob) {
        //     file = new File([fileBlob], fileName, { type: fileBlob.type });
        // } else {
        //     throw new Error('Failed to convert fileBlob into a valid Blob object');
        // }

        const formData = new FormData();
        formData.append('messaging_product', 'whatsapp');
        // formData.append('file', fileBlob, fileName);
        formData.append('file', buffer, { filename: fileName, contentType: fileBlob.type });
        formData.append('description', 'Header Image Template');


        const tokenAccess = await getWhatsAppSettingRecord(tenants, business_number);
        if (!tokenAccess) {
            console.log("Bad Request: Missing WhatsApp settings or tokenAccess is null");
            return;
        }

        const endpointURL = `${tokenAccess.end_point_url}${tokenAccess.business_number_id}/media`;

        const response = await fetch(endpointURL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Authorization': `Bearer ${tokenAccess.access_token}`,
                // 'Access-Control-Allow-Origin': '*',
                // 'Access-Control-Allow-Headers': '*',
                ...formData.getHeaders(),
            },
            body: formData,
            // redirect: 'follow',
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to upload media: ${response.statusText} - ${errorText}`);
        }

        const jsonData = await response.json();
        return jsonData.id;

    } catch (error) {
        console.error('Error during image upload:', error);
    }
}

async function fetchFile(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch file from ${url}`);
    }
    return await response.blob();
}



async function fetchPdf(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch PDF from ${url}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return new Blob([arrayBuffer], { type: 'application/pdf' });
}


// Function to create a message history record
async function createMHistoryRecords(historyRecord, createdbyid, tenants) {
    try {
        msgHistory.init(tenants);
        await msgHistory.createMessageHistoryRecord(historyRecord, createdbyid);
    } catch (dbError) {
        console.error('Failed to create message history record:', dbError);
    }
}

async function updateCampaignStatus(campaignId, status, userid, tenants) {
    const obj = { id: campaignId, status: status };
    campaignModel.init(tenants);
    const updateCampaign = await campaignModel.updateById(campaignId, obj, userid)
    return updateCampaign;
}

async function getWhatsAppSettingRecord(tenants, business_number) {
    wh_Setting.init(tenants);
    const tokenAccess = await wh_Setting.getWhatsAppSettingData(business_number);
    console.log("tokenAccess",tokenAccess)
    return tokenAccess;
}


module.exports = { sendBulkMessage, updateCampaignRecord, uploadWhatsAppMedia, init };