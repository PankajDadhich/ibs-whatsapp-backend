/**
 * @author      Abdul Pathan
 * @date        Aug, 2024
 * @copyright   www.ibirdsservices.com
 */

const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const msgHistory = require("../models/messagehistory.model.js");

module.exports = app => {
    const { body, validationResult } = require('express-validator');
    var router = require("express").Router();

    router.get("/message/history/:id", fetchUser, async (req, res) => {

        const { whatsapp_setting_number } = req.query; 

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }

        msgHistory.init(req.userinfo.tenantcode);

        const result = await msgHistory.getMessageHistoryRecords(req.params.id,whatsapp_setting_number);

        if (result) {
            res.status(200).json({ success: true, records: result });
        } else {
            res.status(200).json({ success: false, errors: "Record does not exist." });
        }
    });

    router.post("/message/history", fetchUser, async (req, res) => {
        msgHistory.init(req.userinfo.tenantcode);
        const result = await msgHistory.createMessageHistoryRecord(req.body, req.userinfo.id);
        if (result) {
            res.status(200).json(result);
        } else {
            res.status(400).json({ errors: "Bad request" });
        }
    });

    // campaign message history download
    router.get("/message/history/download/:id", fetchUser, async (req, res) => {
        msgHistory.init(req.userinfo.tenantcode);

        const result = await msgHistory.getMHRecordsByCampaignId(req.params.id);
        if (result) {
            res.status(200).json({ success: true, records: result });
        } else {
            res.status(200).json({ success: false, errors: "Record does not exist." });
        }
    });

    router.get("/group/message/history/:id", fetchUser, async (req, res) => {

        
        const { whatsapp_setting_number } = req.query; 

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }

        msgHistory.init(req.userinfo.tenantcode);

        const result = await msgHistory.getGroupHistoryRecords(req.params.id,whatsapp_setting_number);

        if (result) {
            res.status(200).json({ success: true, records: result });
        } else {
            res.status(200).json({ success: false, errors: "Record does not exist." });
        }
    });

    app.use(process.env.BASE_API_URL + '/api/whatsapp', router);
};
