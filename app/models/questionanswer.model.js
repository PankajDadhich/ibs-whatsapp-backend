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

const SCHEMA_NAME = 'ibs_meta_whatsapp';


// create message history
async function insertReceivedMessageRecord(message, contactDetails) {

    try {
        if (!message) return;

        const { access_token: whatsapptoken, end_point_url, business_number_id, createdbyid } = await getWhatsAppSettingRecord();

        if (message) {
            if (message.type === 'text') {
                await handleTextMessage(message, contactDetails, createdbyid);
            } else {
                console.log('Message not recieved.')
            }

            // await insertLeadRecord(message, contactDetails, createdbyid);
        }
    } catch (error) {
        console.error('Error recieved messages:', error.message);
    }
}

// handle text message
async function handleTextMessage(message, contactDetails, userid) {
    const textValue = message?.text?.body;
    const phoneNumber = message?.from;

    sendResponseMessage(textValue, phoneNumber, userid);
}

// Response message send
async function sendResponseMessage(textValue, phoneNumber, userid) {


    const messages = {
        'A': `At iBirds Software Services, we provide comprehensive Salesforce Support Services to maximize your CRM investment. \n Please Select Options? \n A2: Why choose iBirds? \n B2: What are iBirds services?`,
        'B': `iBirds Software Pvt. Ltd. is Salesforce Consulting Partners, and a leading customer-centric Consulting Firm based in India(HQ), with offices across India and US.
            Please Select Options	
            A3: Why choose iBirds?
            B3: What are iBirds services?`,
        'A2': `Please Select Options	
            A: Why choose iBirds?
            B: What are iBirds services?
            C: Info on iBirds products?`,
        'B2': `Please Select Options	
            A: Why choose iBirds?
            B: What are iBirds services?
            C: Info on iBirds products?`,
        'A3': `Please Select Options	
            A: Why choose iBirds?
            B: What are iBirds services?
            C: Info on iBirds products?`,
        'B3': `Please Select Options	
            A: Why choose iBirds?
            B: What are iBirds services?
            C: Info on iBirds products?`,
    };


    const inputMessage = messages[textValue.toUpperCase()];

    console.log('inputMessage', inputMessage)

    if (inputMessage) {
        const singleText = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: phoneNumber,
            type: "text",
            text: {
                preview_url: false,
                body: inputMessage
            }
        };

        try {
            const singleTextResponse = await webTemplateModel.singleMessageSend(singleText);
            console.log('singleTextResponse', singleTextResponse)
            return singleTextResponse;
        } catch (error) {
            console.error('Error sending message:', error);
            return { status: 'Failed', error: error.message }; // Return error status if needed
        }
    } else {

        const firstMessage = 'Please Select Options? \n A: Where are iBirds at? \n B: What are iBirds software services?';
        const singleText = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: phoneNumber,
            type: "text",
            text: {
                preview_url: false,
                body: firstMessage
            }
        };

        try {
            const singleTextResponse = await webTemplateModel.singleMessageSend(singleText);
            console.log('singleTextResponse', singleTextResponse)
            return singleTextResponse;
        } catch (error) {
            console.error('Error sending message:', error);
            return { status: 'Failed', error: error.message }; // Return error status if needed
        }
    }



}


// fetch whatsapp setting
async function getWhatsAppSettingRecord() {
    wh_Setting.init(SCHEMA_NAME);
    const tokenAccess = await wh_Setting.getWhatsAppSettingData();
    return tokenAccess;
}


module.exports = { insertReceivedMessageRecord, init };