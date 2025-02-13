/**
 * @author      Abdul Pathan
 * @date        Aug, 2024
 * @copyright   www.ibirdsservices.com
 */

const e = require("express");
const resMessageModel = require("../models/responsemessage.model.js");
const { fetchUser } = require("../middleware/fetchuser.js");

module.exports = app => {
    const { body, validationResult } = require('express-validator');
    var router = require("express").Router();

    // Get All Records
    router.get("/", fetchUser, async (req, res) => {
        resMessageModel.init(req.userinfo.tenantcode);
        const result = await resMessageModel.getAllRecords(req.userinfo);
        if (result) {
            res.status(200).json({ 'success': true, 'records': result });
        } else {
            res.status(200).json({ errors: "No data" });
        }
    });


    // records create
    router.post("/", fetchUser, async (req, res) => {
        const { type, message } = req.body;
        const errors = [];
        const message_Record = {};

        if (req.body.hasOwnProperty("type")) {
            message_Record.type = type; if (!type) { errors.push('type is required') }
        }
        if (req.body.hasOwnProperty("message")) {
            message_Record.message = message; if (!message) { errors.push('message is required') }
        }

        if (errors.length !== 0) {
            return res.status(400).json({ errors: errors });
        }

        resMessageModel.init(req.userinfo.tenantcode);

        const isDuplicate = await resMessageModel.checkDuplicateRecord(req.body.type, req.userinfo.id);

        if (isDuplicate) {
            return res.status(200).json({ success: false, message: "A record with this type already exists" });
        }

        const result = await resMessageModel.createRecord(req.body, req.userinfo.id);
        if (result) {
            res.status(200).json({ success: true, records: result });
        } else {
            res.status(400).json({ success: false, errors: "Bad request" });
        }
    });

    router.put("/:id", fetchUser, async (req, res) => {
        try {
            const { type, message } = req.body;
            const errors = [];
            const message_Record = {};

            if (req.body.hasOwnProperty("type")) {
                message_Record.type = type; if (!type) { errors.push('type is required') }
            }
            if (req.body.hasOwnProperty("message")) {
                message_Record.message = message; if (!message) { errors.push('message is required') }
            };


            if (errors.length !== 0) {
                return res.status(400).json({ errors: errors });
            }

            resMessageModel.init(req.userinfo.tenantcode);

            const isDuplicate = await resMessageModel.checkDuplicateRecord(req.body.type, req.userinfo.id, req.params.id);

            if (isDuplicate) {
                return res.status(200).json({ success: false, message: "A record with this type already exists" });
            }

            let result = await resMessageModel.updateById(req.params.id, message_Record, req.userinfo.id);
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
        resMessageModel.init(req.userinfo.tenantcode);
        const result = await resMessageModel.deleteRecord(req.params.id);
        if (result)
            return res.status(200).json({ success: true, message: "Record Successfully Deleted." });

        res.status(400).json({ success: false, message: "Bad request." });
    });

    app.use(process.env.BASE_API_URL + '/api/response_message', router);
};
