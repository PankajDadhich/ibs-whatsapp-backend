// Testing
/**
 * Handles all incoming request for /api/files endpoint
 * DB table for this public.file
 * Model used here is file.model.js
 * SUPPORTED API ENDPOINTS
 *              GET     /api/files/:pid/*
 *              GET     /api/files/:id
 *              POST    /api/files/:pid
 *              PUT     /api/files/:id
 *              DELETE  /api/files/:id
 * 
 * @author      Aslam Bari
 * @date        Feb, 2023
 * @copyright   www.ibirdsservices.com
 */


const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const File = require("../models/files.model.js");
const path = require('path');
const fs = require('fs');
// const moment = require("moment");


module.exports = app => {


    const { body, validationResult } = require('express-validator');

    var router = require("express").Router();
    var newReq = {};



    // ................................create......................................

    router.post("/:id", fetchUser, [],
        async (req, res) => {


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

            let times = 0;
            const arry = [];
            if (!req.files) { return res.status(400).json({ errors: "No File selected" }); }
            for (const f in req.files) {
                const fileDetail = req.files[f];

                newReq = {
                    "title": fileDetail.name,
                    "filetype": MIMEType.has(fileDetail.mimetype) ? MIMEType.get(fileDetail.mimetype) : fileDetail.mimetype,
                    "parentid": req.params.id,
                    "filesize": fileDetail.size,
                    // "createddate": moment().format("YYYY-MM-DD"),
                    // "createdbyid": req.params.id,
                    "description": req.body.description
                }

                File.init(req.userinfo.tenantcode);
                if (newReq.title.includes('jpg')) {

                    newReq.filetype = 'jpg';
                } else {
                    console.log('The title does not contain "jpg"');
                }

                const fileRec = await File.create(newReq, req.userinfo.id);
                arry.push(fileRec);

                if (!fileRec) {
                    return res.status(400).json({ errors: "Bad Request" });
                }

                let uploadPath = process.env.FILE_UPLOAD_PATH + '/' + req.userinfo.tenantcode + '/' + req.params.id;
                filePath = uploadPath + '/' + fileRec.id + '.' + fileDetail.name.split('.')[1];

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
                } catch (e) {
                    console.log("An error occurred.", e)
                }




            }
            return res.status(200).json(arry);

        });


    // .......................................get all related file by parentID.....................................
    router.get("/:id/all", fetchUser, async (req, res) => {
        try {
            File.init(req.userinfo.tenantcode);
            let resultFile = await File.findByParentId(req.params.id);
            if (resultFile) {
                return res.status(200).json(resultFile);
            } else {
                return res.status(200).json({ "success": false, "message": "No record found" });
            }
        } catch (error) {

        }
    });

    // ................................................get file by Id.......................................
    router.get("/:id", fetchUser, async (req, res) => {
        try {
            File.init(req.userinfo.tenantcode);
            let resultFile = await File.findById(req.params.id);
            if (resultFile) {
                return res.status(200).json(resultFile);
            } else {
                return res.status(200).json({ "success": false, "message": "No record found" });
            }
        } catch (error) {
            console.log('System Error:', error);
            return res.status(400).json({ "success": false, "message": error });
        }
    });


    // ................................................Download file .......................................
    router.get("/:id/download", fetchUser, async (req, res) => {
        try {
            File.init(req.userinfo.tenantcode);
            let fileRec = await File.findById(req.params.id);
            if (!fileRec) {
                return res.status(200).json({ "success": false, "message": "No record found" });
            }
            const fileId = req.params.id;
            const fileTitle = fileRec.title;
            const fileType = fileRec.filetype;
            const parentId = fileRec.parentid
            //const filePath = "D:/Files/" + parentId +"/"+ fileId + '.' + fileType;
            let filePath = process.env.FILE_UPLOAD_PATH + '/' + req.userinfo.tenantcode + '/' + parentId + "/" + fileId;
            res.attachment(fileTitle + '.' + fileType);
            res.download(filePath + '.' + fileType, fileTitle, function (err) {
                console.log('err:', err);
                if (err) {
                    return res.status(400).json({ "Error": false, "message": err });
                }
            });
        } catch (error) {
            console.log('System Error:', error);
            return res.status(400).json({ "Error": false, "message": error });
        }
    });





    // ................................update file........................................................
    router.put("/:id", fetchUser, async (req, res) => {
        try {
            const { title, filetype, filesize, description } = req.body;
            const errors = [];
            const fileRec = {};

            if (req.body.hasOwnProperty("title")) { fileRec.title = title };
            if (req.body.hasOwnProperty("description")) { fileRec.description = description };

            if (errors.length !== 0) {
                return res.status(400).json({ errors: errors });
            }

            File.init(req.userinfo.tenantcode);
            let resultFile = await File.findById(req.params.id);

            if (resultFile) {
                resultFile = await File.updateById(req.params.id, fileRec);
                if (resultFile) {

                    return res.status(200).json({ "success": true, "message": "Record updated successfully" });
                }
                return res.status(200).json(resultFile);


            } else {
                return res.status(200).json({ "success": false, "message": "No record found" });
            }


        } catch (error) {
            res.status(400).json({ errors: error });
        }

    });


    // .......................................... get all file......................................
    router.get("/", fetchUser, async (req, res) => {
        File.init(req.userinfo.tenantcode);
        const files = await File.findAll();
        if (files) {
            res.status(200).json(files);
        } else {
            res.status(400).json({ errors: "No data" });
        }

    });

    // ..................................................delete file by id......................................
    router.delete("/:id", fetchUser, async (req, res) => {
        File.init(req.userinfo.tenantcode);
        let resultFile = await File.findById(req.params.id);
        if (resultFile) {
            const MIMEType = new Map([
                ["text/csv", "csv"],
                ["application/msword", "doc"],
                ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
                ["image/gif", "gif"],
                ["text/html", "html"],
                ["image/jpeg", "jpeg"],
                ["image/jpeg", "jpg"],
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
            //let uploadPath = './app/upload/' + resultFile.parentid;

            let fileRec = await File.findById(req.params.id);
            if (!fileRec) {
                return res.status(200).json({ "success": false, "message": "No record found" });
            }
            const fileId = req.params.id;
            const fileTitle = fileRec.title;
            const fileType = fileRec.filetype;
            const parentId = fileRec.parentid
            //const filePath = "D:/Files/" + parentId +"/"+ fileId + "."+fileType;
            let filePath = process.env.FILE_UPLOAD_PATH + '/' + req.userinfo.tenantcode + '/' + parentId + "/" + fileId;

            //let uploadPath = process.env.FILE_UPLOAD_PATH + resultFile.parentid;

            let type = MIMEType.has(resultFile.filetype) ? MIMEType.get(resultFile.filetype) : resultFile.filetype;
            filePath += '.' + type;

            const result = File.deleteFile(req.params.id);
            if (fs.existsSync(filePath)) {

                //const result = File.deleteFile(req.params.id);
                if (!result) {
                    return res.status(200).json({ "success": false, "message": "No record found" });
                } else {
                    fs.unlinkSync(filePath);
                    return res.status(200).json({ "success": true, "message": "Successfully Deleted" });
                }

            }
        }
        return res.status(400).json({ "success": true, "message": "Successfully Deleted" });
    });

    // Delete all Tutorials
    //router.delete("/", files.deleteAll);
    app.use(process.env.BASE_API_URL + '/api/files', router);
};