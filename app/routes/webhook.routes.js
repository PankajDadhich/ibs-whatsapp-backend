/**
 * @author      Abdul Pathan
 * @date        Aug, 2024
 * @copyright   www.ibirdsservices.com
 */

const express = require("express");
const webModel = require("../models/webhook.model");
const whModel = require("../models/whatsappsetting.model");
const msghistory = require("../models/messagehistory.model.js");

const chatBotMessage = require("../models/autochatbotmessage.model");
// const question_answer = require("../models/questionanswer.model");

const VERIFY_TOKEN = 'MYWHATSAPPTOKEN'; // Use a secure, random string
// https://api.indicrm.io/ibs/api/whatsapp/webhook
// const { fetchUser } = require("../middleware/fetchuser.js");

module.exports = (app, io) => {
    var router = express.Router();

    // Webhook verification endpoint
    router.get('/webhook', (req, res) => {
        try {
            console.log('in webhook:'); // Debugging log
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'];
            const challenge = req.query['hub.challenge'];
            console.log('Webhook verification:', { mode, token, challenge, VERIFY_TOKEN }); // Debugging log

            if (mode && token) {
                if (mode === 'subscribe' && token === VERIFY_TOKEN) {
                    console.log('WEBHOOK_VERIFIED');
                    res.type('text/plain').send(challenge);
                } else {
                    console.error('Verification failed: mode or token incorrect', { mode, token });
                    return res.sendStatus(403); // Forbidden
                }
            } else {
                console.error('Verification failed: Missing mode or token', { mode, token });
                return res.sendStatus(400); // Bad Request
            }
        } catch (error) {
            console.error('Error verifying webhook:', error);
            res.sendStatus(500); // Internal Server Error
        }
    });


    // Handle webhook received messages
    router.post('/webhook', async (req, res) => {
        const body = req.body;
        // const phoneNumber = body.entry[0].changes[0].value.metadata.display_phone_number;
        const phoneNumber = body.entry?.[0]?.changes?.[0]?.value?.metadata?.display_phone_number || null;

        const settingResult = await whModel.getTenantCodeByPhoneNumber(phoneNumber);
        console.log("createdbyid",settingResult)
        const platformData = await whModel.getPlatformData(settingResult?.createdbyid);
        const tenant_code = settingResult?.tenantcode

        console.log('##settingResult', settingResult);
        console.log("platformData",platformData);
        console.log('####req.body', JSON.stringify(req.body))

        if (body.object) {
            console.log("('####body.object",body.object);
            if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
                const message = body.entry[0].changes[0].value.messages[0];
                const contactDetails = body.entry[0].changes[0].value.contacts[0];
              
                if (message && message.from && tenant_code && phoneNumber) {
                    webModel.init(tenant_code);
                    const responce = await webModel.insertReceivedMessageRecord(message, contactDetails, phoneNumber, tenant_code, platformData);
                    // const responce2 = await chatBotMessage.insertReceivedMessageRecord(message, contactDetails, phoneNumber, tenant_code);

                    io.emit("receivedwhatsappmessage", message);// Emit event to connected clients
                }
            }
            if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.statuses) {
                const status = body.entry[0].changes[0].value.statuses[0];
                const messageId = status.id;
                const statusValue = status.status;
                   
                if (messageId && statusValue  && tenant_code && phoneNumber) {

                    msghistory.init(tenant_code);
                    const response = await msghistory.updateMessageStatus(messageId, statusValue);
                    console.log('Status updated in message_history:', response);
                    if (platformData.platform_name && platformData.platform_name !== 'react') {
                    const externalAPIUrl = "https://ibirdssoftwareservicespvt57-dev-ed.develop.my.salesforce-sites.com/services/apexrest/WhatsAppiB/whatsapp/message/updatestatus";
                    const requestBody = {
                        messageId: messageId,
                        status: statusValue
                    };
                    webModel.init(tenant_code);
            
                   const externalResponse = await webModel.sendToExternalAPI(requestBody, externalAPIUrl);
                   console.log("externalResponse",externalResponse);
                }

                    io.emit("receivedwhatsappmessage", status); // Emit status change to connected clients
                }
            }
    
            res.status(200).json({ success: true, event: "success" }); // Return the full response
        } else {
            return res.sendStatus(404); // Not Found
        }
    });

    app.use(process.env.BASE_API_URL + '/api/whatsapp', router);
};
