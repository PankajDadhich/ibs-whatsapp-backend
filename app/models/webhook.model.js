/**
 * @author      Abdul Pathan
 * @date        Aug, 2024
 * @copyright   www.ibirdsservices.com
 */

const sql = require("./db.js");
const { execute } = require('@getvim/execute');
const dbConfig = require("../config/db.config.js");
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); // Ensure you have installed node-fetch || npm install node-fetch@2
const wh_Setting = require("../models/whatsappsetting.model.js");
const fileModel = require("../models/file.model.js");
const msghistory = require("../models/messagehistory.model.js");
const webTemplateModel = require("../models/webhooktemplate.model.js");
// const { fetchUser } = require("../middleware/fetchuser.js");


let schema = '';
function init(schema_name) {
    this.schema = schema_name;
}


// Define MIME types and their corresponding file extensions
const MIMEType = new Map([
    ["text/csv", "csv"],
    ["application/msword", "doc"],
    ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
    ["image/gif", "gif"],
    ["text/html", "html"],
    ["image/jpeg", "jpeg"],
    ["image/jpg", "jpg"],
    ["image/webp", "webp"],
    ["application/json", "json"],
    ["audio/mpeg", "mp3"],
    ["audio/ogg", "ogg"],
    ["video/mp4", "mp4"],
    ["image/png", "png"],
    ["application/pdf", "pdf"],
    ["application/vnd.ms-powerpoint", "ppt"],
    ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx"],
    ["image/svg+xml", "svg"],
    ["text/plain", "txt"],
    ["application/vnd.ms-excel", "xls"],
    ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
    ["text/xm", "xml"],
    ["application/xml", "xml"],
    ["application/atom+xml", "xml"],
    ["application/zip", "zip"],
]);

// create message history
async function insertReceivedMessageRecord(message, contactDetails, phoneNumber, tenant_code, platformData) {
    try {

        if (!message) return;

        const { access_token: whatsapptoken, end_point_url, business_number_id, createdbyid } = await getWhatsAppSettingRecord(phoneNumber, tenant_code);

        if (message) {

            if (message.type == 'text' || message.type === 'button') {
                await handleTextMessage(message, contactDetails, createdbyid, tenant_code, phoneNumber, platformData);
            } else {
                await handleMediaMessage(message, contactDetails, whatsapptoken, end_point_url, business_number_id, createdbyid, tenant_code, phoneNumber, platformData);
            }

            // Consider this insertion logic's placement. Maybe it's better outside the condition?
            await insertLeadRecord(message, contactDetails, createdbyid, tenant_code);
        }
    } catch (error) {
        console.error('Error downloading media:', error.message);
    }
}

// handle text message
async function handleTextMessage(message, contactDetails, userid, tenant_code, phoneNumber,platformData) {
    const textValue = message?.text?.body || message?.button?.text.trim();

    const newMessage = {
        parent_id: null,
        name: contactDetails?.profile?.name || '',
        message_template_id: null,
        whatsapp_number: message.from,
        message: textValue,
        status: 'Incoming',
        recordtypename: '',
        file_id: null,
        is_read: false,
        business_number: phoneNumber,
        message_id: message?.id
    };
console.log("newMessage",newMessage);
    msghistory.init(tenant_code);
    const response = await msghistory.createMessageHistoryRecord(newMessage, userid);

    if (platformData.platform_name && platformData.platform_name !== 'react') {
        const externalData = {
            name: contactDetails?.profile?.name || "",
            whatsapp_number: message.from,
            message: textValue,
            status: "Incoming",
            business_number: phoneNumber,
            url: null, 
            content_type: "text"
        };
        const externalResponse =  await sendToExternalAPI(externalData, platformData.platform_api_endpoint);
        console.log("externalResponse",externalResponse);
    }

console.log("response",response);
    if (response) {
        sendResponseMessage(response, userid, tenant_code, phoneNumber);
    }
}

async function handleMediaMessage(message, contactDetails, whatsapptoken, end_point_url, business_number_id, userid, tenant_code, phoneNumber, platformData) {//userid
    let fileId;
    let fileName;

    switch (message.type) {
        case 'document':
            fileName = message.document.filename || '';
            fileId = message.document.id;
            break;
        case 'image':
            // fileName = message.timestamp || '';
            fileId = message.image.id;
            break;
        case 'video':
            // fileName = message.timestamp || '';
            fileId = message.video.id;
            break;
        case 'audio':
            // fileName = message.timestamp || '';
            fileId = message.audio.id;
            break;
        case 'sticker':
            // fileName = message.timestamp || '';
            fileId = message.sticker.id;
            break;
        default:
            console.log('Unsupported message type:', message.type);
            return;
    }

    if (fileId?.trim()) {
        const apiUrl = `${end_point_url}${fileId.trim()}?phone_number_id=${business_number_id}`;

        try {
            const createURLResponse = await fetch(apiUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${whatsapptoken}` }
            });

            if (!createURLResponse.ok) {
                throw new Error(`Failed to fetch media URL: ${createURLResponse.statusText}`);
            }

            const result = await createURLResponse.json();

            if (result.url && result.id) {
                await processMedia(result, contactDetails, message.from, userid, whatsapptoken, fileName, tenant_code, phoneNumber, platformData, message);//createdbyid
            } else {
                console.log('Media result does not contain URL or id');
            }
        } catch (error) {
            console.error('Error fetching media:', error.message);
        }
    }
}

async function processMedia(result, contactDetails, fromNumber, userid, whatsapptoken, fileName, tenant_code, phoneNumber, platformData, message) {
    try {
        const imageResponse = await fetch(result.url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${whatsapptoken}` }
        });

        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch media file: ${imageResponse.statusText}`);
        }

        const buffer = await imageResponse.buffer();
        const base64String = buffer.toString('base64');
        const fileExtension = MIMEType.has(result.mime_type) ? MIMEType.get(result.mime_type) : result.mime_type;
        const caption = message.image?.caption || message.video?.caption || ''; 
        const newFile = {
            title: fileName ? fileName : `${result.id}.${fileExtension}`,
            filetype: fileExtension,
            filesize: result.file_size,
            description: caption,
            parentid: null
        };
        console.log("newFile",newFile);

      

        fileModel.init(tenant_code);
        const fileInsert = await fileModel.insertFileRecords(newFile, userid);
        if (fileInsert) {
            const savedFileResponse = await saveFile(buffer, fileInsert.title,tenant_code);
         
            if(savedFileResponse){
                const fileUrl = `${process.env.BASE_URL}public/${tenant_code}/attachment/${fileInsert.title}`;
                if (platformData.platform_name && platformData.platform_name !== 'react') {
                    // const caption = message.image?.caption || message.video?.caption || ''; 
                    const externalData = {
                        name: contactDetails?.profile?.name || "",
                        whatsapp_number: fromNumber,
                        message: caption,
                        status: "Incoming",
                        business_number: phoneNumber,
                        url: fileUrl, 
                        content_type: fileExtension
                    };
                    const externalResponse =  await sendToExternalAPI(externalData, platformData.platform_api_endpoint);
                    console.log("externalResponse",externalResponse);
            
                }
            }
            await logMessageHistory(contactDetails, fromNumber, userid, fileInsert.id, tenant_code, phoneNumber, message);
        }
    } catch (error) {
        console.error('Error processing media:', error.message);
    }
}

async function saveFile(buffer, title, tenant_code) {
    const uploadPath = process.env.FILE_UPLOAD_PATH + '/' + tenant_code + '/attachment' || path.resolve(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
    }

    const filePath = path.join(uploadPath, title);
    fs.writeFileSync(filePath, buffer);
    return true;  

}

async function logMessageHistory(contactDetails, fromNumber, userid, fileId, tenant_code, phoneNumber, message) {
    const newMessage = {
        parent_id: null,
        name: contactDetails?.profile?.name || '',
        message_template_id: null,
        whatsapp_number: fromNumber,
        message: '',
        status: 'Incoming',
        recordtypename: '',
        file_id: fileId,
        is_read: false,
        business_number: phoneNumber,
        message_id: message?.id
    };

    msghistory.init(tenant_code);
    const historyRecordResponse = await msghistory.createMessageHistoryRecord(newMessage, userid);
    if (historyRecordResponse) {
        sendResponseMessage(historyRecordResponse, userid, tenant_code, phoneNumber);
    }
}



// Response message send
async function sendResponseMessage(msg, userid, tenant_code, phoneNumber) {

    if (!msg.whatsapp_number) {
        console.log('WhatsApp number is missing.');
        return;
    }


    const findIncomingQuery = `SELECT id, name, whatsapp_number FROM ${tenant_code}.message_history 
                                WHERE status = 'Incoming' AND whatsapp_number = $1 AND createdbyid = $2 `;

    const findIncomingRecord = await sql.query(findIncomingQuery, [msg.whatsapp_number, userid]);
    console.log("findIncomingRecord",findIncomingRecord);

    if (findIncomingRecord.rows.length !== 1) {
        console.log('Message already sent or not found.');
        return;
    }


    const findOutgoingQuery = `SELECT id, name, recordtypename FROM ${tenant_code}.message_history 
                WHERE (recordtypename = 'campaign' OR recordtypename = 'contact' OR recordtypename = 'lead' OR recordtypename = 'user') AND whatsapp_number = $1 AND createdbyid = $2
                LIMIT 1`;


    const findOutgoingRecord = await sql.query(findOutgoingQuery, [msg.whatsapp_number, userid]);  // Correct query variable
console.log("findOutgoingRecord",findOutgoingRecord)
    // if (findOutgoingRecord.rows.length === 0) {
    //     console.log('No outgoing message found for this number.');
    //     return;
    // }

    const recordType = findOutgoingRecord.rows[0]?.recordtypename || 'common_message';

    const textMessageMap = {
        'Campaign': 'Campaign',
        'Lead': 'Lead',
        'User': 'User',
        'common_message': 'common_message'
    };

    let textMessage = textMessageMap[recordType];

    const findResponseMessageQuery = `SELECT message FROM ${tenant_code}.auto_response_message WHERE type = $1 AND createdbyid = $2  LIMIT 1 `;
    let findResponseMessageRecord = await sql.query(findResponseMessageQuery, [textMessage, userid]);  // Correct query variable

    if (findResponseMessageRecord.rows.length === 0) {
        findResponseMessageRecord = await sql.query(findResponseMessageQuery, ['common_message', userid]);
        if (findResponseMessageRecord.rows.length === 0) {
            console.log('No common response message found.');
            return;
        }
    }

    const responseMessage = findResponseMessageRecord.rows[0].message;

    const singleText = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: msg.whatsapp_number,
        type: "text",
        text: {
            preview_url: false,
            body: responseMessage
        }
    };

    try {
        webTemplateModel.init(tenant_code);
        const response = await webTemplateModel.singleMessageSend(singleText, phoneNumber);
        const messageId = response?.messages[0]?.id;

        if (response.messaging_product === 'whatsapp') {
            const newMessage = {
                parent_id: msg.id || null,
                name: msg?.name || '',
                template_name: '',
                whatsapp_number: msg.whatsapp_number,
                message: responseMessage,
                status: 'Outgoing',
                recordtypename: (textMessage === 'campaign' || textMessage === 'common_message') ? '' : textMessage,
                file_id: null,
                is_read: true,
                business_number: phoneNumber,
                message_id: messageId
            };

            msghistory.init(tenant_code);
            const historyRecordResponse = await msghistory.createMessageHistoryRecord(newMessage, userid);
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

// inser lead record
async function insertLeadRecord(message, contactDetails, userid, tenant_code) {
    const number = message?.from;
    const name = contactDetails?.profile?.name;
console.log("insertLeadRecord",message, contactDetails, userid, tenant_code)
    let [firstName, lastName] = name ? name.split(" ") : [null, null];
    let leadstatus = 'Open - Not Contacted';
    let leadsource = 'Web';

    try {

        const findQuery = `SELECT id, whatsapp_number, createdbyid FROM ${tenant_code}.lead WHERE whatsapp_number = $1 AND createdbyId = $2 `;
        const findRecord = await sql.query(findQuery, [number, userid]);

        if (findRecord.rows.length > 0) {
            console.log('Lead Record already exists:', findRecord.rows[0]);
            return { record: findRecord.rows[0], existing: true };
        }

        const insertQuery = `INSERT INTO ${tenant_code}.lead (firstname, lastname, whatsapp_number, leadstatus, leadsource, ownerid, createdbyid, lastmodifiedbyid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;
        const result = await sql.query(insertQuery, [firstName, lastName, number, leadstatus, leadsource, userid, userid, userid]);

        if (result.rows.length > 0) {
            console.log('Inserted record:', result.rows[0]);
            return { record: result.rows[0], existing: false }; // Indicate it's a new record
        }

        console.log('Insert failed, no rows returned.');
        return null;

    } catch (error) {
        console.error('Error during database operation:', error);
        throw new Error('Database operation failed'); // Optional: propagate the error
    }
}

// fetch whatsapp setting
async function getWhatsAppSettingRecord(whatsappNumber, tenant_code) {
    wh_Setting.init(tenant_code);
    console.log("getWhatsAppSettingRecord",tenant_code);
    const tokenAccess = await wh_Setting.getWhatsAppSettingData(whatsappNumber);
    return tokenAccess;
}

async function sendToExternalAPI(data, url) {
    try {
        // const url = "https://ibirdssoftwareservicespvt57-dev-ed.develop.my.site.com/whatsapp/services/apexrest/WhatsAppiB/incoming";
        console.log('data, url',data, url);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const responseBody = await response.json();
        console.log("External API Response:", responseBody);
    } catch (error) {
        console.error("Error sending data to external API:", error);
    }
}


module.exports = { insertReceivedMessageRecord, sendToExternalAPI, init };