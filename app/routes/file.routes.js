/**
 * @author      Abdul Pathan
 * @date        Aug, 2024
 * @copyright   www.ibirdsservices.com
 */

const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const fileModel = require("../models/file.model.js");
const path = require('path');
const fs = require('fs');
// const messagehistory = require("../models/messagehistory.model.js");
// const moment = require("moment");

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
    ["audio/ogg", "ogg"],
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


  // router.post("/:id", fetchUser, async (req, res) => {
  //   try {
  //     if (!req.files && !req.body.audio) {
  //       return res.status(400).json({ errors: "No file or audio selected" });
  //     }

  //     const { id } = req.params;
  //     const { description } = req.body;
  //     const fileArray = req.files ? Object.values(req.files) : [];
  //     let times = 0;
  //     const responseArray = [];

  //     // Process uploaded files
  //     for (const fileDetail of fileArray) {
  //       const fileExtension = MIMEType.get(fileDetail.mimetype) || path.extname(fileDetail.name);

  //       const newFile = {
  //         title: fileDetail.name,
  //         filetype: fileExtension,
  //         filesize: fileDetail.size,
  //         description: description,
  //         parentid: id || null
  //       };

  //       fileModel.init(req.userinfo.tenantcode);
  //       const fileInsert = await fileModel.insertFileRecords(newFile, req.userinfo.id);

  //       responseArray.push(fileInsert);

  //       if (!fileInsert) {
  //         return res.status(400).json({ errors: "Bad Request" });
  //       }

  //       let uploadPath = process.env.FILE_UPLOAD_PATH +'/'+ req.userinfo.tenantcode + '/attachment';
  //       const filePath = path.join(uploadPath, fileInsert.title);

  //       if (!fs.existsSync(uploadPath)) {
  //         fs.mkdirSync(uploadPath, { recursive: true });
  //       }


  //       fs.writeFileSync(filePath, fileDetail.data);


  //       // Move file to the correct directory
  //       // fileDetail.mv(filePath, (err) => {
  //       //   if (err) {
  //       //     return res.status(500).send(err);
  //       //   }
  //       // });
  //     }

  //     // Process audio file if available
  //     if (req.body.audio) {

  //       const audioBuffer = Buffer.from(req.body.audio, 'base64');
  //       const audioFilename = `audio_${Date.now()}.wav`;
  //       const dfile = process.env.FILE_UPLOAD_PATH +'/' + req.userinfo.tenantcode +  '/attachment'
  //       const audioPath = path.join(dfile, audioFilename);

  //       fs.writeFile(audioPath, audioBuffer, (err) => {
  //         if (err) {
  //           return res.status(500).json({ errors: "Error saving audio file", detail: err.message });
  //         }

  //         // responseArray.push({ success: true, audioFile: audioFilename });
  //       });
  //     }

  //     return res.status(200).json({ success: true, records: responseArray });

  //   } catch (error) {
  //     console.error('An error occurred:', error);
  //     return res.status(500).json({ errors: 'Internal Server Error' });
  //   }
  // });
  router.post('/:id', fetchUser, async (req, res) => {
    try {
        if (!req.files && !req.body.audio) {
            return res.status(400).json({ errors: 'No file or audio selected' });
        }
  
        const { id } = req.params;
        const { description } = req.body;
        const fileArray = req.files ? Object.values(req.files) : [];
        const responseArray = [];
        const uploadPath = path.join(process.env.FILE_UPLOAD_PATH, req.userinfo.tenantcode, 'attachment');
  
        // Ensure upload directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
  
        // Process uploaded files
        for (const fileDetail of fileArray) {
            const fileExtension = path.extname(fileDetail.name);
            let newFileName = fileDetail.name;
  
            // Generate a unique file name if the file already exists
            let filePath = path.join(uploadPath, newFileName);
            if (fs.existsSync(filePath)) {
                const timestamp = Date.now();
                newFileName = `${path.basename(fileDetail.name, fileExtension)}_${timestamp}${fileExtension}`;
                filePath = path.join(uploadPath, newFileName);
            }
  
            const newFile = {
                title: newFileName,
                filetype: fileExtension,
                filesize: fileDetail.size,
                description: description,
                parentid: id || null
            };
  
            fileModel.init(req.userinfo.tenantcode);
            const fileInsert = await fileModel.insertFileRecords(newFile, req.userinfo.id);
            if (!fileInsert) {
                return res.status(400).json({ errors: 'Bad Request' });
            }
            responseArray.push(fileInsert);
  
            fs.writeFileSync(filePath, fileDetail.data);
        }
  
        // Process audio file if available
        if (req.body.audio) {
            try {
                const audioBuffer = Buffer.from(req.body.audio, 'base64');
                const audioFilename = `audio_${Date.now()}.wav`;
                const audioPath = path.join(uploadPath, audioFilename);
                await fs.promises.writeFile(audioPath, audioBuffer);
                responseArray.push({ success: true, audioFile: audioFilename });
            } catch (err) {
                return res.status(500).json({ errors: 'Error saving audio file', detail: err.message });
            }
        }
  
        return res.status(200).json({ success: true, records: responseArray });
    } catch (error) {
        console.error('An error occurred:', error);
        return res.status(500).json({ errors: 'Internal Server Error' });
    }
  });

  app.use(process.env.BASE_API_URL + '/api/whatsapp/files', router);
};