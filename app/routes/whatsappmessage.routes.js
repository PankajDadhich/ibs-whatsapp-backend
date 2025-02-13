/**
 * @author      Abdul Pathan
 * @date        Sep, 2024
 * @copyright   www.ibirdsservices.com  
 */

const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const whatsMsg = require("../models/whatsappmessage.model.js");
const permissions = require("../constants/permissions.js");

module.exports = app => {
    const { body, validationResult } = require('express-validator');
    var router = require("express").Router();

    // **********************************
    router.get("/filter", fetchUser, async (req, res) => {
        whatsMsg.init(req.userinfo.tenantcode);

        const { textName, cityName, recordType } = req.query;

        try {
            const result = await whatsMsg.getRecords(recordType, textName, cityName, req.userinfo);

            if (result.length > 0) {
                res.status(200).json({ success: true, records: result });
            } else {
                res.status(200).json({ success: false, message: "No data found" });
            }
        } catch (error) {
            console.error("Error fetching records:", error);
            res.status(500).json({ success: false, message: "Server error", error });
        }
    });

    router.get("/unread_count:?", fetchUser, async (req, res) => {
        const { whatsapp_setting_number } = req.query; 

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }

        whatsMsg.init(req.userinfo.tenantcode);

        try {
            let result = await whatsMsg.getUnreadMsgCounts(req.userinfo.id,whatsapp_setting_number);
            if (result) {
                return res.status(200).json({ success: true, records: result });
            } else {
                return res.status(200).json({ "success": false, "message": "No records found" });
            }
        } catch (error) {
            return res.status(400).json({ "success": false, "message": error });
        }
    });

    router.post("/mark_as_read:?", fetchUser, async (req, res) => {
        const { whatsapp_number } = req.body;

        if (!whatsapp_number) {
            return res.status(400).json({ success: false, message: "whatsapp number is required" });
        }

  const { whatsapp_setting_number } = req.query; 

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }

        whatsMsg.init(req.userinfo.tenantcode);

        try {
            let result = await whatsMsg.markAsRead(whatsapp_number, req.userinfo.id,whatsapp_setting_number);
            if (result) {
                return res.status(200).json({ success: true, message: "Messages marked as read" });
            } else {
                return res.status(200).json({ success: false, message: "No records updated" });
            }
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    });

    app.use(process.env.BASE_API_URL + '/api/whatsapp/chat', router);
};
