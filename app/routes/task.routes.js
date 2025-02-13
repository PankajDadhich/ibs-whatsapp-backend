/**
 * Handles all incoming request for /api/tasks endpoint
 * DB table for this public.task
 * Model used here is task.model.js
 * SUPPORTED API ENDPOINTS
 *              GET     /api/tasks/:pid/*
 *              GET     /api/tasks/:id
 *              POST    /api/tasks/:pid
 *              PUT     /api/tasks/:id
 *              DELETE  /api/tasks/:id
 * 
 * @author      Aslam Bari
 * @date        Feb, 2023
 * @copyright   www.ibirdsservices.com
 */

const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const Task = require("../models/task.model.js");
const permissions = require("../constants/permissions.js");
const Mailer = require("../models/mail.model.js");
const Auth = require("../models/auth.model.js");


module.exports = app => {


  const { body, validationResult } = require('express-validator');

  var router = require("express").Router();

  // Create a new Task
  router.post("/", fetchUser, [
    body('title', 'Please enter title').isLength({ min: 1 })
  ],

    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      Task.init(req.userinfo.tenantcode);
      const taskRec = await Task.create(req.body, req.userinfo.id);

      if (!taskRec) {
        return res.status(400).json({ errors: "Bad Request" });
      }

      return res.status(200).json(taskRec);

    });

  // Retrieve all Task
  router.get("/", fetchUser, async (req, res) => {
    Task.init(req.userinfo.tenantcode);
    const tasks = await Task.findAll();
    if (tasks) {
      res.status(200).json(tasks);
    } else {
      res.status(400).json({ errors: "No data" });
    }

  });

  // Retrieve all Task
  router.get("/today", fetchUser, async (req, res) => {
    Task.init(req.userinfo.tenantcode);
    const tasks = await Task.findAllToday();
    if (tasks) {
      res.status(200).json(tasks);
    } else {
      res.status(400).json({ errors: "No data" });
    }

  });

  // Retrieve all Task
  router.get("/meetings/:today", fetchUser, async (req, res) => {
    Task.init(req.userinfo.tenantcode);
    const tasks = await Task.findAllMeetings(req.userinfo, req.params.today);
    if (tasks) {
      res.status(200).json(tasks);
    } else {
      res.status(400).json({ errors: "No data" });
    }

  });

  // Retrieve all Task
  router.get("/opentasks", fetchUser, async (req, res) => {
    Task.init(req.userinfo.tenantcode);
    const tasks = await Task.findAllOpen(req.userinfo);
    if (tasks) {
      res.status(200).json(tasks);
    } else {
      res.status(400).json({ errors: "No data" });
    }

  });

  // Retrieve a single Task with id
  router.get("/:id", fetchUser, async (req, res) => {
    try {
      Task.init(req.userinfo.tenantcode);
      let resultTask = await Task.findById(req.params.id);
      if (resultTask) {
        return res.status(200).json(resultTask);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }
    } catch (error) {
      console.log('System Error:', error);
      return res.status(400).json({ "success": false, "message": error });
    }
  });

  // Update a Task with id
  router.put("/:id", fetchUser, async (req, res) => {
    try {
      const { title, priority, status, type, description, parentid, ownerid, createdbyid, lastmodifiedbyid, targetdate, createddate, lastmodifieddate, startdatetime, enddatetime } = req.body;
      const errors = [];
      const taskRec = {};;

      if (req.body.hasOwnProperty("title")) { taskRec.title = title; if (!title) { errors.push('Title is required') } };
      if (req.body.hasOwnProperty("description")) { taskRec.description = description };
      if (req.body.hasOwnProperty("priority")) { taskRec.priority = priority };
      if (req.body.hasOwnProperty("targetdate")) { taskRec.targetdate = targetdate };
      if (req.body.hasOwnProperty("parentid")) { taskRec.parentid = parentid };
      if (req.body.hasOwnProperty("ownerid")) { taskRec.ownerid = ownerid };
      if (req.body.hasOwnProperty("status")) { taskRec.status = status };
      if (req.body.hasOwnProperty("type")) { taskRec.type = type };
      if (req.body.hasOwnProperty("createddate")) { taskRec.createddate = createddate };
      if (req.body.hasOwnProperty("lastmodifieddate")) { taskRec.lastmodifieddate = lastmodifieddate };
      if (req.body.hasOwnProperty("createdbyid")) { taskRec.createdbyid = createdbyid };
      if (req.body.hasOwnProperty("lastmodifiedbyid")) { taskRec.lastmodifiedbyid = lastmodifiedbyid };
      if (req.body.hasOwnProperty("startdatetime")) { taskRec.startdatetime = startdatetime };
      if (req.body.hasOwnProperty("enddatetime")) { taskRec.enddatetime = enddatetime };


      if (errors.length !== 0) {
        return res.status(400).json({ errors: errors });
      }

      Task.init(req.userinfo.tenantcode);
      let resultTask = await Task.findById(req.params.id);


      if (resultTask) {
        // console.log('resultTask:', resultTask);
        resultTask = await Task.updateById(req.params.id, taskRec, req.userinfo.id);
        if (resultTask) {
          return res.status(200).json({ "success": true, "message": "Record updated successfully" });
        }
        return res.status(200).json(resultTask);


      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }


    } catch (error) {
      res.status(400).json({ errors: error });
    }

  });
  //......................................Get Task by OwnerId.................................
  router.get("/:pid/*", fetchUser, async (req, res) => {
    try {
      //Check permissions


      Task.init(req.userinfo.tenantcode);
      let resultTask = await Task.findByParentId(req.params.pid);
      if (resultTask) {
        return res.status(200).json(resultTask);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }
    } catch (error) {
      console.log('System Error:', error);
      return res.status(400).json({ "success": false, "message": error });
    }
  });

  // Delete a Task with id
  router.delete("/:id", fetchUser, async (req, res) => {
    Task.init(req.userinfo.tenantcode);
    const result = await Task.deleteTask(req.params.id);
    if (!result)
      return res.status(200).json({ "success": false, "message": "No record found" });

    res.status(400).json({ "success": true, "message": "Successfully Deleted" });
  });

  // Delete all Tutorials
  //router.delete("/", contacts.deleteAll);


  // Create a new Task
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
      let task = {};
      task.title = req.body.subject;
      task.priority = 'Normal';
      task.status = 'Completed';
      task.type = 'Email';
      task.description = req.body.editorHtml;
      task.parentid = req.body.parentid,
        task.ownerid = req.userinfo.id;
      task.toemail = req.body.to;
      task.fromemail = fromAdd;
      task.ccemail = req.body.to;
      task.targetdate = new Date();

      Task.init(req.userinfo.tenantcode);
      const taskRec = await Task.create(task, req.userinfo.id);

      if (!taskRec) {
        return res.status(400).json({ errors: "Bad Request" });
      } else {


        res.status(200).json(taskRec);

        if (req.body.to) {
          const userRec = await Auth.findById(req.userinfo.id);
          let fromAdd = `${userRec.firstname} ${userRec.lastname}<${userRec.email}>`;
          Mailer.sendEmail(req.body.to, null, req.body.subject, null, null, req.body.editorHtml, fromAdd);
        }

      }
    });

  app.use(process.env.BASE_API_URL + '/api/tasks', router);
};