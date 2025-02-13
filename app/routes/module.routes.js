/**
 * @author      Shivani Mehra
 * @date        Nov, 2024
 * @copyright   www.ibirdsservices.com
 */

const e = require("express");
const moduleModel = require("../models/module.model.js");
const { fetchUser } = require("../middleware/fetchuser.js");

module.exports = app => {
    const { body, validationResult } = require('express-validator');
    var router = require("express").Router();

    // Get All Records
    router.get("/:?", fetchUser, async (req, res) => {
        const { status } = req.query;

        moduleModel.init(req.userinfo.tenantcode);
        const result = await moduleModel.getAllRecords(status);
        if (result) {
            res.status(200).json({ 'success': true, 'records': result });
        } else {
            res.status(200).json({ errors: "No data" });
        }
    });


    // records create
    router.post("/", fetchUser, async (req, res) => {
        const { name, status, api_name, icon, url, icon_type, order_no } = req.body;
        const errors = [];
        const module_record = {};

        if (req.body.hasOwnProperty("name")) {
            module_record.name = name; if (!name) { errors.push('name is required') }
        }
        if (req.body.hasOwnProperty("status")) {
            module_record.message = status; if (!status) { errors.push('status is required') }
        }

        if (req.body.hasOwnProperty("icon")) {
            module_record.message = icon; if (!icon) { errors.push('icon is required') }
        }
        if (req.body.hasOwnProperty("order_no")) {
            module_record.message = order_no; if (!order_no) { errors.push('order_no is required') }
        }
        if (req.body.hasOwnProperty("status")) {
            module_record.message = status; if (!status) { errors.push('status is required') }
        }
        if (req.body.hasOwnProperty("api_name")) {
            module_record.message = api_name; if (!api_name) { errors.push('api name is required') }
        }

        if (errors.length !== 0) {
            return res.status(400).json({ errors: errors });
        }

        moduleModel.init(req.userinfo.tenantcode);

        const isDuplicate = await moduleModel.checkDuplicateRecord(req.body.name);

        if (isDuplicate) {
            return res.status(200).json({ success: false, message: "A record with this Name already exists" });
        }

        const result = await moduleModel.createRecord(req.body);
        if (result) {
            res.status(200).json({ success: true, records: result });
        } else {
            res.status(400).json({ success: false, errors: "Bad request" });
        }
    });

    router.put("/:id", fetchUser, async (req, res) => {
        try {
            const { name, order_no, status, icon_type, icon, api_name, url} = req.body;
            const errors = [];
            const module_record = {};

            if (req.body.hasOwnProperty("name")) {
                module_record.name = name; if (!name) { errors.push('Name is required') }
            }
            if (req.body.hasOwnProperty("order_no")) {
                module_record.order_no = order_no; if (!order_no) { errors.push('order no. is required') }
            };

            if (req.body.hasOwnProperty("status")) {
                module_record.status = status; if (!status) { errors.push('status is required') }
            }
            if (req.body.hasOwnProperty("icon_type")) {
                module_record.icon_type = icon_type; if (!icon_type) { errors.push('icon type is required') }
            };
            if (req.body.hasOwnProperty("icon")) {
                module_record.icon = icon; if (!icon) { errors.push('icon name is required') }
            }
            if (req.body.hasOwnProperty("url")) {
                module_record.url = url; if (!url) { errors.push('url is required') }
            };
            if (req.body.hasOwnProperty("api_name")) {
                module_record.api_name = api_name;
            };

            if (errors.length !== 0) {
                return res.status(400).json({ errors: errors });
            }

            moduleModel.init(req.userinfo.tenantcode);
            const isDuplicate = await moduleModel.checkDuplicateRecord(req.body.name, req.params.id);

            if (isDuplicate) {
                return res.status(200).json({ success: false, message: "A record with this name already exists" });
            }

            let result = await moduleModel.updateById(req.params.id, module_record);
            if (result) {
                return res.status(200).json({ "success": true, message: "Record updated successfully." });
            } else {
                return res.status(200).json({ "success": false, message: "Bad request." });
            }
        } catch (error) {
            res.status(400).json({ errors: error });
        }
    });

    // delete record
    router.delete("/:id", fetchUser, async (req, res) => {
        moduleModel.init(req.userinfo.tenantcode);
        const result = await moduleModel.deleteRecord(req.params.id);
        if (result)
            return res.status(200).json({ success: true, message: "Record Successfully Deleted." });

        res.status(400).json({ success: false, message: "Bad request." });
    });

    app.use(process.env.BASE_API_URL + '/api/whatsapp/module', router);
};
