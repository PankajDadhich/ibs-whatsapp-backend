/**
 * @author      Abdul Pathan
 * @date        Aug, 2024
 * @copyright   www.ibirdsservices.com
 */

const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const campaignModel = require("../models/campaign.model.js");
const fileModel = require("../models/file.model.js");
const path = require('path');
const fs = require('fs');

module.exports = app => {
    const { body, validationResult } = require('express-validator');
    var router = require("express").Router();

    // Define MIME types and their corresponding file extensions
    const MIMEType = new Map([
        ["text/csv", "csv"],
        ["application/msword", "doc"],
        ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
        ["image/gif", "gif"],
        ["text/html", "html"],
        ["image/jpeg", "jpeg"],
        ["image/jpg", "jpg"],
        ["application/json", "json"],
        ["audio/mpeg", "mp3"],
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


    // fetch campaign record 
    router.get("/campaign", fetchUser, async (req, res) => {

        const { whatsapp_setting_number } = req.query; 

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }
        campaignModel.init(req.userinfo.tenantcode);
        // const statusName = req.query.status;
        const result = await campaignModel.getRecords(req.userinfo,whatsapp_setting_number);

        if (result) {
            res.status(200).json({ success: true, records: result });
        } else {
            res.status(200).json({ success: false, errors: "Record not exist." });
        }
    });

     router.get("/campaign/:id", fetchUser, async (req, res) => {
        campaignModel.init(req.userinfo.tenantcode);
        const result = await campaignModel.findById(req.params.id);
        if (!result) {
          return res.status(400).json({ errors: "Not Exist..!!" });
        }
        return res.status(200).json(result);
      })

    // campaign records create
    router.post("/campaign", fetchUser, async (req, res) => {

        const { name, type, status, template_name, start_date, group_ids, business_number } = req.body;
        const errors = [];
        const campaignRecord = {};

        if (req.body.hasOwnProperty("name")) {
            campaignRecord.name = name
        }
        if (req.body.hasOwnProperty("type")) {
            campaignRecord.type = type; if (!type) { errors.push('type is required') }
        };
        if (req.body.hasOwnProperty("status")) {
            campaignRecord.status = status; if (!status) { errors.push('status is required') }
        };
        if (req.body.hasOwnProperty("template_name")) {
            campaignRecord.template_name = template_name; if (!template_name) { template_name; errors.push('template_name is required') }
        };
        if (req.body.hasOwnProperty("start_date")) {
            campaignRecord.start_date = start_date; if (!start_date) { start_date; errors.push('start_date is required') }
        };

        // if (req.body.hasOwnProperty("group_ids")) {
        //     campaignRecord.group_ids = group_ids
        // }
        if (req.body.hasOwnProperty("group_ids")) {
            campaignRecord.group_ids = Array.isArray(group_ids) ? group_ids : [];
        }
        

        if (req.body.hasOwnProperty("business_number")) {
            campaignRecord.business_number = business_number
        }

        if (errors.length !== 0) {
            return res.status(400).json({ errors: errors });
        }

        campaignModel.init(req.userinfo.tenantcode);

        const result = await campaignModel.createRecord(req.body, req.userinfo.id);
        if (result) {
            res.status(200).json({ success: true, record: result });
        } else {
            res.status(400).json({ success: false, errors: "Bad request" });
        }
    });

    router.put("/campaign/:id", fetchUser, async (req, res) => {
        try {
            const { name, type, template_name, start_date, group_ids } = req.body;
            const errors = [];
            const campaignRecord = {};

            if (req.body.hasOwnProperty("name")) {
                campaignRecord.name = name
            }
            if (req.body.hasOwnProperty("template_name")) {
                campaignRecord.template_name = template_name; if (!template_name) { template_name; errors.push('template_name is required') }
            };
            if (req.body.hasOwnProperty("start_date")) {
                campaignRecord.start_date = start_date; if (!start_date) { start_date; errors.push('start_date is required') }
            };

            if (req.body.hasOwnProperty("type")) { campaignRecord.type = type };

            if (req.body.hasOwnProperty("group_ids")) {
                campaignRecord.group_ids = group_ids
            }


            if (errors.length !== 0) {
                return res.status(400).json({ errors: errors });
            }

            campaignModel.init(req.userinfo.tenantcode);
            let result = await campaignModel.findById(req.params.id);

            if (result) {
                result = await campaignModel.updateById(req.params.id, campaignRecord, req.userinfo.id);
                if (result) {
                    return res.status(200).json({ "success": true, message: "Record updated successfully." });
                } else {
                    return res.status(200).json({ "success": fale, message: "Bad Request." });
                }

            } else {
                return res.status(200).json({ "success": false, "message": "No record found" });
            }
        } catch (error) {
            res.status(400).json({ errors: error });
        }
    });

    // campaign file download
    router.get("/campaign/download/:filename", fetchUser, async (req, res) => {
        try {
            const filename = req.params.filename;
            let filePath = `${process.env.FILE_UPLOAD_PATH}/${req.userinfo.tenantcode}/campaign_files/${filename}`;

            // Check if file exists before attempting to download
            const fs = require('fs');
            if (!fs.existsSync(filePath)) {
                console.error('File not found:', filePath);
                return res.status(404).json({ "Error": true, "message": "File not found" });
            }

            res.download(filePath, filename, (err) => {
                if (err) {
                    console.error('Download error:', err);
                    if (err.code === 'ENOENT') {
                        return res.status(404).json({ "Error": true, "message": "File not found" });
                    } else if (err.code === 'ECONNABORTED') {
                        return;
                    } else {
                        return res.status(500).json({ "Error": true, "message": "Internal server error" });
                    }
                }
            });
        } catch (error) {
            console.log('System Error:', error);
            if (!res.headersSent) {
                return res.status(400).json({ "Error": false, "message": error.message });
            }
        }
    });



    // only campaign file upload
    router.post("/campaign/file/:id", fetchUser, async (req, res) => {
        try {

            if (!req.files) {
                return res.status(400).json({ errors: "No File selected" });
            }

            const { id } = req.params;
            const { description } = req.body;

            let times = 0;
            const arry = [];

            for (const fileDetail of Object.values(req.files)) {
                const fileExtension = MIMEType.get(fileDetail.mimetype) || path.extname(fileDetail.name);

                const newFile = {
                    title: fileDetail.name,
                    filetype: fileExtension,
                    filesize: fileDetail.size,
                    description: description,
                    parentid: id
                }

                fileModel.init(req.userinfo.tenantcode);
                const fileInsert = await fileModel.insertFileRecords(newFile, req.userinfo.id);
                arry.push(fileInsert);

                if (fileInsert) {

                    let uploadPath = process.env.FILE_UPLOAD_PATH +'/' +req.userinfo.tenantcode+'/' + 'campaign_files';
                    // filePath = uploadPath + '/' + fileDetail.name;
                    const filePath = uploadPath + '/' + fileInsert.title;

                    try {
                        if (fs.existsSync(uploadPath)) {
                            fileDetail.mv(filePath, (err) => {
                                if (err) {
                                    return res.send(err);
                                }
                            })
                        } else {
                            if (times === 0) { fs.mkdirSync(uploadPath, { recursive: true }); times++; }
                            fileDetail.mv(filePath, (err) => {
                                if (err) {
                                    return res.send(err);
                                }
                            })
                        }
                    } catch (err) {
                        return res.status(500).json({ errors: 'File system error', detail: err.message });
                    }
                }
            }
            return res.status(200).json({ success: true, data: arry });

        } catch (error) {
            console.error('An error occurred:', error);
            return res.status(500).json({ errors: 'Internal Server Error' });
        }
    });
    router.post("/campaign/params", fetchUser, async (req, res) => {
        campaignModel.init(req.userinfo.tenantcode);
        const result = await campaignModel.createparamsRecord(req.body, req.userinfo.id);
        if (result) {
            res.status(200).json({ success: true, record: result });
        } else {
            res.status(400).json({ success: false, errors: "Bad request" });
        }
    });
    
    router.get("/campaign/params/:id", fetchUser, async (req, res) => {
        campaignModel.init(req.userinfo.tenantcode);
        const result = await campaignModel.getparamsRecord(req.params.id);
        if (result) {
            res.status(200).json({ success: true, record: result });
        } else {
            res.status(400).json({ success: false, errors: "Bad request" });
        }
    });

    app.use(process.env.BASE_API_URL + '/api/whatsapp', router);
};