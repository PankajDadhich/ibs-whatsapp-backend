/**
 * @author      Abdul Pathan
 * @date        Aug, 2024
 * @copyright   www.ibirdsservices.com
 */

const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const msgTemplate = require("../models/messagetemplate.model.js");

module.exports = app => {
    const { body, validationResult } = require('express-validator');
    var router = require("express").Router();

    //  Message Info records create
    router.post("/message/template", fetchUser, async (req, res) => {
        msgTemplate.init(req.userinfo.tenantcode);
        const findRecs = await msgTemplate.findRecord(req.body);
        if (findRecs) {
            const { id, name, language, category, header, header_body, message_body, example_body_text, footer, buttons, business_number } = req.body;
            const obj = {
                template_id: id,
                template_name: name,
                language: language,
                category: category,
                header: header,
                header_body: header_body,
                message_body: message_body,
                example_body_text: example_body_text,
                footer: footer,
                buttons: JSON.stringify(buttons),
                business_number: business_number
            }
            const updatedRecord = await msgTemplate.updateById(findRecs.id, obj, req.userinfo.id);
            res.status(200).json(updatedRecord);
        }
        else {
            const result = await msgTemplate.createRecords(req.body, req.userinfo.id);
            if (result) {
                res.status(200).json(result);
            } else {
                res.status(400).json({ error: "Bad request" });
            }
        }
    });


    app.use(process.env.BASE_API_URL + '/api/whatsapp', router);
};