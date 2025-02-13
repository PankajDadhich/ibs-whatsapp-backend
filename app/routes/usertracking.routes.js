const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const UserTracking = require("../models/usertracking.model.js");
const permissions = require("../constants/permissions.js");

module.exports = app => {


  const { body, validationResult } = require('express-validator');
  var router = require("express").Router();

  // ..............................Create UserTracking..........................................
  router.post("/", fetchUser, [
    body('logindatetime', 'Please enter login datatime').isLength({ min: 1 }),
    body('loginlattitude', 'Please enter login lattitude').isLength({ min: 1 }),
    body('loginlongitude', 'Please enter login longitude').isLength({ min: 1 })
  ],

    async (req, res) => {
      //Check permissions
      // const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_ATTENDANCE || el.name === permissions.VIEW_ALL || el.name === permissions.MODIFY_ALL);
      // if (!permission)
      //   return res.status(401).json({ errors: "Unauthorized" });


      // const errors = validationResult(req);
      // if (!errors.isEmpty()) {
      //   return res.status(400).json({ errors: errors.array() });
      // }
      UserTracking.init(req.userinfo.tenantcode);
      const objRec = await UserTracking.create(req.body, req.userinfo.id);
      if (!objRec) {
        return res.status(400).json({ errors: "Bad Request" });
      }
      return res.status(200).json(objRec);
    });

  // ..............................Get All UserTracking........................................
  router.get("/", fetchUser, async (req, res) => {
    //Check permissions
    // const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_ATTENDANCE || el.name === permissions.LIST_ATTENDANCE || el.name === permissions.VIEW_ALL || el.name === permissions.MODIFY_ALL);
    // if (!permission)
    //   return res.status(401).json({ errors: "Unauthorized" });

    UserTracking.init(req.userinfo.tenantcode);
    const allRecords = await UserTracking.findAll();
    if (allRecords) {
      res.status(200).json(allRecords);
    } else {
      res.status(400).json({ errors: "No data" });
    }

  });

  // .....................................Get UserTracking by Id........................................
  router.get("/:id", fetchUser, async (req, res) => {
    try {
      // const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_ATTENDANCE || el.name === permissions.LIST_ATTENDANCE || el.name === permissions.VIEW_ALL || el.name === permissions.MODIFY_ALL);
      // if (!permission)
      //   return res.status(401).json({ errors: "Unauthorized" });

      UserTracking.init(req.userinfo.tenantcode);
      let resultObj = await UserTracking.findById(req.params.id);
      if (resultObj) {
        return res.status(200).json(resultObj);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }
    } catch (error) {
      return res.status(400).json({ "success": false, "message": error });
    }

  });

  //.........................................Update UserTracking .....................................
  router.put("/:id", fetchUser, async (req, res) => {
    try {
      // const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_ATTENDANCE || el.name === permissions.VIEW_ALL || el.name === permissions.MODIFY_ALL);
      // if (!permission)
      //   return res.status(401).json({ errors: "Unauthorized" });

      const { location, logoutdatetime, logoutlattitude, logoutlongitude, remarks, parentid } = req.body;
      const errors = [];
      const objRec = {};

      if (req.body.hasOwnProperty("location")) { objRec.location = location };
      if (req.body.hasOwnProperty("logoutdatetime")) { objRec.logoutdatetime = logoutdatetime; if (!logoutdatetime) { errors.push('logoutdatetime is required') } };
      if (req.body.hasOwnProperty("logoutlattitude")) { objRec.logoutlattitude = logoutlattitude; if (!logoutlattitude) { errors.push('logoutlattitude is required') } };
      if (req.body.hasOwnProperty("logoutlongitude")) { objRec.logoutlongitude = logoutlongitude; if (!logoutlongitude) { errors.push('logoutlongitude is required') } };
      if (req.body.hasOwnProperty("remarks")) { objRec.remarks = remarks };
      if (req.body.hasOwnProperty("parentid")) { objRec.parentid = parentid };


      if (errors.length !== 0) {
        return res.status(400).json({ errors: errors });
      }
      UserTracking.init(req.userinfo.tenantcode);
      let resultObj = await UserTracking.findById(req.params.id);
      if (resultObj) {
        resultObj = await UserTracking.updateById(req.params.id, objRec, req.userinfo.id);
        if (resultObj) {
          return res.status(200).json({ "success": true, "message": "Record updated successfully" });
        }
        return res.status(200).json(resultObj);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }

    } catch (error) {
      res.status(400).json({ errors: error });
    }

  });

  // ..............................Get tracking currentrecord........................................
  router.get("/staff/:staffid", fetchUser, async (req, res) => {

    if (req.userinfo.userrole == 'USER') {
      res.status(400).json({ errors: "Unauthorized" });
      return;
    }

    // const permission = req.userinfo.permissions.find(el => el.name === permissions.LIST_ATTENDANCE || el.name === permissions.VIEW_ALL || el.name === permissions.MODIFY_ALL);
    // if (!permission)
    //   return res.status(401).json({ errors: "Unauthorized" });

    UserTracking.init(req.userinfo.tenantcode);
    let staffId = req.params.staffid;
    const allRecords = await UserTracking.getStaffLoginHistory(staffId);
    if (allRecords) {
      res.status(200).json(allRecords);
    } else {
      res.status(400).json({ errors: "No data" });
    }

  });


  // ..............................Get tracking currentrecord........................................
  router.get("/track/currentrecord", fetchUser, async (req, res) => {
    // const permission = req.userinfo.permissions.find(el => el.name === permissions.VIEW_ATTENDANCE || el.name === permissions.VIEW_ALL || el.name === permissions.MODIFY_ALL);
    // if (!permission)
    //   return res.status(401).json({ errors: "Unauthorized" });
    UserTracking.init(req.userinfo.tenantcode);
    const allRecords = await UserTracking.findCurrentRecordByUserId(req.userinfo.id);
    if (allRecords) {
      res.status(200).json(allRecords);
    } else {
      res.status(200).json({ errors: "No data" });
    }

  });


  // ...............................................Delete UserTracking......................................
  router.delete("/:id", fetchUser, async (req, res) => {
    UserTracking.init(req.userinfo.tenantcode);
    const result = await UserTracking.deleteUserTracking(req.params.id);
    if (!result)
      return res.status(200).json({ "success": false, "message": "No record found" });

    res.status(400).json({ "success": true, "message": "Successfully Deleted" });
  });

  app.use(process.env.BASE_API_URL + '/api/usertrackings', router);
};

