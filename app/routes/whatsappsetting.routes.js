/**
 * @author      Abdul Pathan
 * @date        Aug, 2024
 * @copyright   www.ibirdsservices.com
 */

const e = require("express");
const wh_Setting = require("../models/whatsappsetting.model.js");
const { fetchUser } = require("../middleware/fetchuser.js");

module.exports = app => {
    const { body, validationResult } = require('express-validator');
    var router = require("express").Router();

    // Get All Records
    router.get("/", fetchUser, async (req, res) => {

        wh_Setting.init(req.userinfo.tenantcode);

        const result = await wh_Setting.getAllWhatsAppSetting(req.userinfo);
        if (result) {
            res.status(200).json({ 'success': true, 'record': result });
        } else {
            res.status(200).json({ errors: "No data" });
        }
    });

    // records create
    router.post("/", fetchUser, async (req, res) => {


        const { name, app_id, access_token, business_number_id, whatsapp_business_account_id, end_point_url, phone } = req.body;
        const errors = [];
        const wh_Record = {};

        if (req.body.hasOwnProperty("name")) {
            wh_Record.name = name
        }
        if (req.body.hasOwnProperty("app_id")) {
            wh_Record.app_id = app_id; if (!app_id) { errors.push('app_id is required') }
        };
        if (req.body.hasOwnProperty("access_token")) {
            wh_Record.access_token = access_token; if (!access_token) { errors.push('access_token is required') }
        };
        if (req.body.hasOwnProperty("business_number_id")) {
            wh_Record.business_number_id = business_number_id; if (!business_number_id) { errors.push('business_number_id is required') }
        };
        if (req.body.hasOwnProperty("whatsapp_business_account_id")) {
            wh_Record.whatsapp_business_account_id = whatsapp_business_account_id; if (!whatsapp_business_account_id) { whatsapp_business_account_id; errors.push('whatsapp_business_account_id is required') }
        };
        if (req.body.hasOwnProperty("end_point_url")) {
            wh_Record.end_point_url = end_point_url; if (!end_point_url) { end_point_url; errors.push('end_point_url is required') }
        };
        if (req.body.hasOwnProperty("phone")) {
            wh_Record.phone = phone; if (!phone) { phone; errors.push('Phone is required') }
        };

        if (errors.length !== 0) {
            return res.status(400).json({ errors: errors });
        }
        wh_Setting.init(req.userinfo.tenantcode);

        const currentWhatsAppSettingsCount = await wh_Setting.getCount();
        const allowedWhatsAppSettings = req.userinfo.plan.number_of_whatsapp_setting;
        if (currentWhatsAppSettingsCount >= allowedWhatsAppSettings) {
            return res.status(400).json({
                success: false,
                message: `You’ve reached the limit of ${allowedWhatsAppSettings} WhatsApp settings. Please upgrade your plan to add more.`
            });
        }

        

        const result = await wh_Setting.createRecord(req.body, req.userinfo.id);
        if (result) {
            res.status(200).json({ success: true, records: result });
        } else {
            res.status(400).json({ success: false, errors: "Bad request" });
        }
    });

    router.put("/:id", fetchUser, async (req, res) => {
        try {
            const { name, app_id, access_token, business_number_id, whatsapp_business_account_id, end_point_url, phone } = req.body;
            const errors = [];
            const wh_Record = {};

            if (req.body.hasOwnProperty("name")) {
                wh_Record.name = name
            }
            if (req.body.hasOwnProperty("app_id")) {
                wh_Record.app_id = app_id; if (!app_id) { errors.push('app_id is required') }
            };
            if (req.body.hasOwnProperty("access_token")) {
                wh_Record.access_token = access_token; if (!access_token) { errors.push('access_token is required') }
            };
            if (req.body.hasOwnProperty("business_number_id")) {
                wh_Record.business_number_id = business_number_id; if (!business_number_id) { errors.push('business_number_id is required') }
            };
            if (req.body.hasOwnProperty("whatsapp_business_account_id")) {
                wh_Record.whatsapp_business_account_id = whatsapp_business_account_id; if (!whatsapp_business_account_id) { whatsapp_business_account_id; errors.push('whatsapp_business_account_id is required') }
            };
            if (req.body.hasOwnProperty("end_point_url")) {
                wh_Record.end_point_url = end_point_url; if (!end_point_url) { end_point_url; errors.push('end_point_url is required') }
            };
            if (req.body.hasOwnProperty("phone")) {
                wh_Record.phone = phone; if (!phone) { phone; errors.push('Phone is required') }
            };
          

            if (errors.length !== 0) {
                return res.status(400).json({ errors: errors });
            }


            wh_Setting.init(req.userinfo.tenantcode);

            let result = await wh_Setting.findById(req.params.id);
            if (result) {
                result = await wh_Setting.updateById(req.params.id, wh_Record, req.userinfo.id);
                if (result) {
                    return res.status(200).json({ "success": true, message: "Record updated successfully" });
                }
            } else {
                return res.status(200).json({ "success": false, "message": "No record found" });
            }
        } catch (error) {
            res.status(400).json({ errors: error });
        }
    });


router.put('/activate/:setting_id', fetchUser, async (req, res) => {
    const { setting_id } = req.params;
        try {

            wh_Setting.init(req.userinfo.tenantcode);
            const result = await wh_Setting.updateSettingStatus(setting_id, req.userinfo.id);
            if (result && result.rowCount > 0) {
                res.status(200).json({ success: true, message: 'updated successfully' });
            } else {
                res.status(404).json({ success: false, message: 'Setting not found' });
            }
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    });
    
    router.get("/billing-cost/:setting_number/:start/:end", fetchUser, async (req, res) => {

        await wh_Setting.init(req.userinfo.tenantcode);
        const { setting_number, start, end } = req.params; 
        try {
            const response = await wh_Setting.getWhatsupBillingCost(setting_number, start, end);
            console.log(response);
            let result = response?.conversation_analytics?.data[0]?.data_points || [];
            if (result.length) {
                return res.status(200).json({ success: true, result});
            } else {
                return res.status(400).json({ success: false, error: 'Bad Request: Missing WhatsApp settings or data' });
            }
        } catch (error) {
            console.error('Error during message sending:', error);
            return res.status(500).json({ error: error.message });
        }
    });
    app.use(process.env.BASE_API_URL + '/api/whatsapp_setting', router);
};
