/**
 * @author      Abdul Pathan
 * @date        Oct, 2024
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

const SCHEMA_NAME = 'ibs_ibirds';


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
async function insertReceivedMessageRecord(message, contactDetails, phoneNumber, tenant_code) {

    try {
        if (!message) return;

        const { access_token: whatsapptoken, end_point_url, business_number_id, createdbyid } = await getWhatsAppSettingRecord(phoneNumber, tenant_code);

        if (message) {
            if (message.type === 'text' || message.type === 'button') {
                await handleTextMessage(message, contactDetails, createdbyid, tenant_code, phoneNumber);
                // await handleTextMessage(message, contactDetails, createdbyid, tenant_code, phoneNumber);
            } else {
                console.log('Message not recieved.')
            }
        }
    } catch (error) {
        console.error('Error recieved messages:', error.message);
    }
}

// handle text message
async function handleTextMessage(message, contactDetails, userid, tenant_code, phoneNumber) {
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
        business_number: phoneNumber
    };

    msghistory.init(tenant_code);
    const msghistoryResponse = await msghistory.createMessageHistoryRecord(newMessage, userid);

    if (msghistoryResponse) {
        if (message.type === 'text') {
            const empName = contactDetails?.profile?.name || ''
            await sendTemplateMessage(msghistoryResponse, empName, userid, tenant_code, phoneNumber);
        } else if (message.type === 'button') {
            sendResponseMessage(msghistoryResponse, userid, tenant_code, phoneNumber);
        }
    }
}

// Response message send
async function sendResponseMessage(msghistoryResponse, userid, tenant_code, phoneNumber) {
    const resultQuery = `SELECT id, question, answer FROM ${tenant_code}.auto_response WHERE LOWER(question) = $1 `;
    const findAutoResponseRecord = await sql.query(resultQuery, [msghistoryResponse.message.toLowerCase()]);

    if (findAutoResponseRecord.rows.length === 1) {
        const singleText = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: msghistoryResponse.whatsapp_number,
            type: "text",
            text: {
                preview_url: false,
                body: findAutoResponseRecord.rows[0].answer
            }
        };

        try {
            webTemplateModel.init(tenant_code);
            const singleTextResponse = await webTemplateModel.singleMessageSend(singleText, phoneNumber);

            if (singleTextResponse.messaging_product === 'whatsapp') {
                const newMessage = {
                    parent_id: msghistoryResponse?.parent_id || null,
                    name: msghistoryResponse?.name || '',
                    template_name: '',
                    whatsapp_number: msghistoryResponse?.whatsapp_number,
                    message: findAutoResponseRecord.rows[0].answer,
                    status: 'Outgoing',
                    recordtypename: '',
                    file_id: null,
                    is_read: true,
                    business_number: phoneNumber
                };

                msghistory.init(tenant_code);
                const historyRecordResponse = await msghistory.createMessageHistoryRecord(newMessage, userid);
                return historyRecordResponse;
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    } else {
        console.log('Auto response message not found.')
    }
}

async function sendTemplateMessage(msghistoryResponse, empName, userid, tenant_code, phoneNumber) {

    const templateName = 'ibirds_software_services_pvt_ltd';
    const findTemplateQuery = `SELECT id, template_name FROM ${tenant_code}.message_template WHERE template_name = $1 LIMIT 1`;

    const findTemplateRecord = await sql.query(findTemplateQuery, [templateName]);

    if (findTemplateRecord.rows.length === 0) {
        console.error('Template not found');
        return { status: 'Failed', error: 'Template not found' };
    }

    if (!msghistoryResponse.whatsapp_number || !empName) {
        console.error('Invalid whatsapp number or employee name');
        return { status: 'Failed', error: 'Invalid input data' };
    }


    // if (findTemplateRecord.rows.length > 0) {


    const payload = {
        messaging_product: 'whatsapp',
        to: msghistoryResponse.whatsapp_number,
        type: 'template',
        category: 'MARKETING',
        template: {
            name: templateName,
            language: {
                code: 'en_US',
            },
            components: [
                {
                    type: "HEADER",
                    parameters: [
                        {
                            type: "text",
                            text: empName
                        }
                    ]
                }
            ]
        }
    };


    try {
        const tokenAccess = await getWhatsAppSettingRecord(phoneNumber, tenant_code);
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

        const newMessage = {
            parent_id: null,
            name: msghistoryResponse.name || '',
            whatsapp_number: msghistoryResponse.whatsapp_number,
            message: '',
            status: 'Outgoing',
            recordtypename: '',
            message_template_id: msghistoryResponse.message_template_id || null,
            file_id: null,
            is_read: true,
            business_number: phoneNumber
        }

        msghistory.init(tenant_code);
        const historyRecordResponse = await msghistory.createMessageHistoryRecord(newMessage, userid);
        return historyRecordResponse;
    } catch (error) {
        console.error('Error sending message:', error.message);
        return { status: 'Failed', error: error.message };
    }

}


 
async function getWhatsAppSettingRecord(whatsappNumber, tenant_code) {
    wh_Setting.init(tenant_code); 
    const tokenAccess = await wh_Setting.getWhatsAppSettingData(whatsappNumber);
    return tokenAccess;
}


module.exports = { insertReceivedMessageRecord, init };