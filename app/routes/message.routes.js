/**
 * Handles all incoming request for /api/messages endpoint
 * DB table for this public.message
 * Model used here is message.model.js
 * SUPPORTED API ENDPOINTS
 *              GET     /api/messages/:pid/*
 *              GET     /api/messages/:id
 *              POST    /api/messages/:pid
 *              PUT     /api/messages/:id
 *              DELETE  /api/messages/:id
 * 
 * @author      Aslam Bari
 * @date        Feb, 2023
 * @copyright   www.ibirdsservices.com
 */

const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const Message = require("../models/message.model.js");
const permissions = require("../constants/permissions.js");
const Mailer = require("../models/mail.model.js");
const Auth = require("../models/auth.model.js");
var io;

module.exports = (app, importIO) => {
  io = importIO;

  const { body, validationResult } = require('express-validator');

  var router = require("express").Router();

  // Create a new Message
  router.post("/", fetchUser, [
    body('description', 'Please enter title').isLength({ min: 1 })
  ],

    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      Message.init(req.userinfo.tenantcode);
      const messageRec = await Message.create(req.body, req.userinfo.id);

      if (!messageRec) {
        return res.status(400).json({ errors: "Bad Request" });
      }
      //aslam sir id
      // io.to("59b02983-536c-4899-9c2e-86c7145b29b9").emit("greetings", req.body.description);
      return res.status(200).json(messageRec);

    });

  /**create user message alert */
  router.post("/usermsg", fetchUser, [
  ],
    async (req, res) => {
      console.log('Usre msg Insert only')
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('inside  the if')
        return res.status(400).json({ errors: errors.array() });
      }
      Message.init(req.userinfo.tenantcode);
      Message.init(req.userinfo.tenantcode);
      const messageRec = await Message.createUserMsgAlert(req.body, req.userinfo.id, req.userinfo.tenantcode);

      console.log('messageRec:', messageRec);
      if (!messageRec) {
        return res.status(400).json({ errors: "Bad Request" });
      }
      req.body.result.forEach(function (msg) {
        io.to(msg.userId).emit("greetings", msg.description);
      })
      console.log("sending 111");
      console.log("messageRec Record==>", messageRec);
      return res.status(200).json(messageRec);

    });

  // Retrieve all Message
  router.get("/", fetchUser, async (req, res) => {
    Message.init(req.userinfo.tenantcode);
    const messages = await Message.findAll();
    // console.log('messages:', messages);
    if (messages) {
      res.status(200).json(messages);
    } else {
      res.status(400).json({ errors: "No data" });
    }

  });

  // Retrieve all Message
  router.get("/unread", fetchUser, async (req, res) => {
    Message.init(req.userinfo.tenantcode);
    const messages = await Message.findAllUnread(req.userinfo.id);
    // console.log('messages:', messages);
    if (messages) {
      res.status(200).json(messages);
    } else if (messages === null) {
      res.status(404).json({ errors: "No data found" });
    } else {
      res.status(400).json({ errors: "Not found" });
    }
  });

  //...................................... Update Message Alert 13-07-2023 .................................
  router.put("/readalertmsg/:id", fetchUser, async (req, res) => {
    try {
      Message.init(req.userinfo.tenantcode);
      let resultMessage = await Message.findUnreadMessageById(req.params.id);

      if (resultMessage) {
        resultMessage = await Message.updateUnreadMessageById(req.params.id, req.userinfo.id);
        if (resultMessage) {
          return res.status(200).json({ "success": true, "message": "Record updated successfully" });
        }
        return res.status(200).json(resultMessage);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }
    } catch (error) {
      console.log('System Error:', error);
      return res.status(400).json({ "success": false, "message": error });
    }
  });


  // Retrieve all Message
  router.get("/meetings/:today", fetchUser, async (req, res) => {
    Message.init(req.userinfo.tenantcode);
    const messages = await Message.findAllMeetings(req.userinfo, req.params.today);
    // console.log('messages:', messages);
    if (messages) {
      res.status(200).json(messages);
    } else {
      res.status(400).json({ errors: "No data" });
    }

  });

  // Retrieve all Message
  router.get("/openmessages", fetchUser, async (req, res) => {
    Message.init(req.userinfo.tenantcode);
    const messages = await Message.findAllOpen(req.userinfo);
    // console.log('messages:', messages);
    if (messages) {
      res.status(200).json(messages);
    } else {
      res.status(400).json({ errors: "No data" });
    }

  });

  // Retrieve a single Message with id
  router.get("/:id", fetchUser, async (req, res) => {
    try {
      console.log('req.id:', req.id);
      Message.init(req.userinfo.tenantcode);
      let resultMessage = await Message.findById(req.params.id);
      if (resultMessage) {
        return res.status(200).json(resultMessage);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }
    } catch (error) {
      console.log('System Error:', error);
      return res.status(400).json({ "success": false, "message": error });
    }
  });

  // Update a Message with id
  router.put("/:id", fetchUser, async (req, res) => {
    try {
      const { title, priority, status, type, description, parentid, ownerid, createdbyid, lastmodifiedbyid, targetdate, createddate, lastmodifieddate, startdatetime, enddatetime } = req.body;
      const errors = [];
      const messageRec = {};;

      console.log("fnm", req.body.hasOwnProperty("salutation"));
      if (req.body.hasOwnProperty("title")) { messageRec.title = title; if (!title) { errors.push('Title is required') } };
      if (req.body.hasOwnProperty("description")) { messageRec.description = description };
      if (req.body.hasOwnProperty("priority")) { messageRec.priority = priority };
      if (req.body.hasOwnProperty("targetdate")) { messageRec.targetdate = targetdate };
      if (req.body.hasOwnProperty("parentid")) { messageRec.parentid = parentid };
      if (req.body.hasOwnProperty("ownerid")) { messageRec.ownerid = ownerid };
      if (req.body.hasOwnProperty("status")) { messageRec.status = status };
      if (req.body.hasOwnProperty("type")) { messageRec.type = type };
      if (req.body.hasOwnProperty("createddate")) { messageRec.createddate = createddate };
      if (req.body.hasOwnProperty("lastmodifieddate")) { messageRec.lastmodifieddate = lastmodifieddate };
      if (req.body.hasOwnProperty("createdbyid")) { messageRec.createdbyid = createdbyid };
      if (req.body.hasOwnProperty("lastmodifiedbyid")) { messageRec.lastmodifiedbyid = lastmodifiedbyid };
      if (req.body.hasOwnProperty("startdatetime")) { messageRec.startdatetime = startdatetime };
      if (req.body.hasOwnProperty("enddatetime")) { messageRec.enddatetime = enddatetime };

      if (errors.length !== 0) {
        return res.status(400).json({ errors: errors });
      }

      Message.init(req.userinfo.tenantcode);
      let resultMessage = await Message.findById(req.params.id);

      if (resultMessage) {
        console.log('resultMessage:', resultMessage);
        resultMessage = await Message.updateById(req.params.id, messageRec, req.userinfo.id);
        if (resultMessage) {
          return res.status(200).json({ "success": true, "message": "Record updated successfully" });
        }
        return res.status(200).json(resultMessage);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }

    } catch (error) {
      res.status(400).json({ errors: error });
    }

  });
  //......................................Get Message by OwnerId.................................
  router.get("/:pid/*", fetchUser, async (req, res) => {
    try {
      //Check permissions


      Message.init(req.userinfo.tenantcode);
      let resultMessage = await Message.findByParentId(req.params.pid);
      if (resultMessage) {
        return res.status(200).json(resultMessage);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }
    } catch (error) {
      console.log('System Error:', error);
      return res.status(400).json({ "success": false, "message": error });
    }
  });

  // Delete a Message with id
  router.delete("/:id", fetchUser, async (req, res) => {
    console.log("deleteing")
    Message.init(req.userinfo.tenantcode);
    const result = await Message.deleteMessage(req.params.id);
    if (!result)
      return res.status(200).json({ "success": false, "message": "No record found" });

    res.status(400).json({ "success": true, "message": "Successfully Deleted" });
  });

  // Delete all Tutorials
  //router.delete("/", contacts.deleteAll);


  // Create a new Message
  router.post("/sendemail", fetchUser, [
    body('subject', 'Please enter subject').isLength({ min: 1 }),
    body('to', 'Please enter to').isLength({ min: 1 })
  ],

    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const userRec = await Auth.findById(req.userinfo.id);
      let fromAdd = `${userRec.firstname} ${userRec.lastname}<${userRec.email}>`;
      console.log('req.body', req.body);
      let message = {};
      message.title = req.body.subject;
      message.priority = 'Normal';
      message.status = 'Completed';
      message.type = 'Email';
      message.description = req.body.editorHtml;
      message.parentid = req.body.parentid,
        message.ownerid = req.userinfo.id;
      message.toemail = req.body.to;
      message.fromemail = fromAdd;
      message.ccemail = req.body.to;
      message.targetdate = new Date();

      Message.init(req.userinfo.tenantcode);
      const messageRec = await Message.create(message, req.userinfo.id);



      console.log('messageRec:', messageRec);

      if (!messageRec) {
        return res.status(400).json({ errors: "Bad Request" });
      } else {


        res.status(200).json(messageRec);

        if (req.body.to) {
          const userRec = await Auth.findById(req.userinfo.id);
          let fromAdd = `${userRec.firstname} ${userRec.lastname}<${userRec.email}>`;
          Mailer.sendEmail(req.body.to, req.body.subject, req.body.editorHtml, fromAdd);
        }

      }
    });

  app.use(process.env.BASE_API_URL + '/api/messages', router);
};