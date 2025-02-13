/**
 * @author      Abdul Pathan
 * @date        Aug, 2024
 * @copyright   www.ibirdsservices.com
 */

const express = require("express");
const webModel = require("../models/webhook.model");
const VERIFY_TOKEN = 'MYWHATSAPPTOKENALKAPURI'; // Use a secure, random string
// https://api.indicrm.io/ibs/api/whatsapp/webhook

module.exports = (app, io) => {
    var router = express.Router();

    // Webhook verification endpoint
    router.get('/whatsapp', (req, res) => {
        try {
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
    router.post('/whatsapp', async (req, res) => {
        const body = req.body;

        console.log('####req.body', JSON.stringify(req.body))

        if (body.object) {
            if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
                const message = body.entry[0].changes[0].value.messages[0];
                const contactDetails = body.entry[0].changes[0].value.contacts[0];
                const phoneNumber = body.entry[0].changes[0].value.metadata.display_phone_number;
                console.log('phoneNumberId', phoneNumber)

                if (message && message.from) {
                    webModel.init('ibs_ibirds');
                    const responce = await webModel.insertReceivedMessageRecord(message, contactDetails, phoneNumber);
                    // const responce2 = await chatBotMessage.insertReceivedMessageRecord(message, contactDetails);
                    // const responce3 = await question_answer.insertReceivedMessageRecord(message, contactDetails)

                    io.emit("receivedwhatsappmessage", message);// Emit event to connected clients
                }
            }
            res.status(200).json({ success: true, event: "success" }); // Return the full response
        } else {
            return res.sendStatus(404); // Not Found
        }
    });

    app.use(process.env.BASE_API_URL + '/api/webhook', router);
};
