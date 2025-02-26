/**
 * Handles all incoming request for /api/auth endpoint
 * DB table for this public.user
 * Model used here is auth.model.js
 * SUPPORTED API ENDPOINTS
 *              GET     /api/auth/getuser
 *              POST    /api/createuser
 *              POST     /api/login
 * 
 * @author      Aslam Bari
 * @date        Feb, 2023
 * @copyright   www.ibirdsservices.com
 */

const e = require("express");
const Auth = require("../models/auth.model.js");
const { fetchUser } = require("../middleware/fetchuser.js");
const File = require("../models/file.model.js");
const Company = require("../models/company.model.js");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

module.exports = app => {

  const { body, validationResult } = require('express-validator');

  var router = require("express").Router();

  // Create a new Tutorial
  router.post("/createuser", fetchUser, [
    body('email', 'Please enter email').isEmail(),
    body('password', 'Please enter password').isLength({ min: 6 }),
    body('firstname', 'Please enter firstname').isLength({ min: 2 }),
    body('lastname', 'Please enter lastname').isLength({ min: 2 }),
    body('whatsapp_settings', 'WhatsApp settings must be an array').optional().isArray()
  ],


    async (req, res) => {
      // #swagger.tags = ['Users']
      // #swagger.path = ['/api/auth/createuser']
      await Auth.init(req.userinfo.tenantcode);
      const { firstname, lastname, email, password, userrole, managerid, isactive, whatsapp_number, whatsapp_settings } = req.body;
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const salt = bcrypt.genSaltSync(10);
      const secPass = bcrypt.hashSync(req.body.password, salt);

      const duplicateUser = await Auth.checkForDuplicate(email, whatsapp_number);

      if (duplicateUser) {
        if (duplicateUser.email === email) {
          return res.status(200).json({ errors: "Email already exists" });
        } else if (duplicateUser.whatsapp_number === whatsapp_number) {
          return res.status(200).json({ errors: "WhatsApp number already exists" });
        }
      }

      const currentUserCount = await Auth.getUserCount(req.userinfo.companyid);
      const allowedUserCount = req.userinfo.plan.number_of_users;
  
      if (currentUserCount >= allowedUserCount) {
          return res.status(400).json({
              errors: `Your plan allows only ${allowedUserCount} users. Please upgrade your plan to add more.`
          });
      }

      const userRec = await Auth.findByEmail(email);
      if (userRec) {
        return res.status(200).json({ errors: "User already exist with given email." });
      }

      // const allowedLicenses = await Auth.checkLicenses(req.userinfo.companyid);
      // if (!allowedLicenses) {
      //   return res.status(400).json({ errors: "Licenses limit exceeded" });
      // }

      const newUser = await Auth.createUser({
        firstname: firstname,
        lastname: lastname,
        email: email,
        password: secPass,
        userrole: userrole,
        managerid: managerid,
        companyid: req.userinfo.companyid,
        isactive: isactive,
        whatsapp_number: whatsapp_number,
        whatsapp_settings: whatsapp_settings ? JSON.stringify(whatsapp_settings) : null 
      });
      if (newUser) {
        const data = {
          id: newUser.id
        };

        const authToken = jwt.sign(data, process.env.JWT_SECRET);

        const newRole = await Auth.setRole(userrole, newUser);

        return res.status(200).json({ success: true, id: newUser.id, authToken: authToken });
      }
      else
        return res.status(400).json({ errors: "Bad request" });

      // contacts.create(req, res);

    });

  // Create a new Tutorial
  router.post("/login", [
    body('email', 'Please enter email').isEmail(),
    body('password', 'Please enter password').isLength({ min: 1 }),
    body('tcode', 'Please enter company code').exists(),
  ],
    async (req, res) => {
      // #swagger.tags = ['Users']
      // #swagger.path = ['/api/auth/login']
      let success = false;
      try {
        const { email, password, tcode  } = req.body;
    console.log(email, password, tcode)

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ success, errors: errors.array() });
        }

        const checkForTcode = await Auth.checkCompanybyTcode(tcode);
        if(!checkForTcode){
          return res.status(400).json({ success, errors: "The company name you entered is incorrect. Please check and try again." });
        }

        // const companyData = await Company.findByEmail(email);
        // await Auth.init(companyData.tenantcode);
        await Auth.init(tcode);

        const userRec = await Auth.findByEmail(email);
        if (!userRec) {
          return res.status(200).json({ success, errors: "Try to login with correct credentials" });
        }
        const userInfo = userRec.userinfo;
        const passwordCompare = await bcrypt.compare(password, userInfo.password);
        if (!passwordCompare) {
          return res.status(400).json({ success, errors: "Try to login with correct credentials" });
        }

        //removing sensitive data from token
        delete userInfo.password;
        // delete userInfo.email;
        let username = userInfo.firstname + ' ' + userInfo.lastname;
        let userrole = userInfo.userrole;
        let companyname = userInfo.companyname;
        let tenantcode = userInfo.tenantcode;
        delete userInfo.firstname;
        delete userInfo.lastname;
        userInfo.username = username;
        const authToken = jwt.sign(userInfo, process.env.JWT_SECRET, { expiresIn: '5h' });
        const refreshToken = jwt.sign({'email':userInfo.email}, process.env.JWT_REFRESH_SECERT_KEY, { expiresIn: '7d' });
        success = true;
        //const permissions = userInfo.permissions;
        return res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'strict' }).status(200).json({ success, authToken, refreshToken });
   
        // return res.status(200).json({ success, authToken, refreshToken });
      } catch (error) {
        console.log(error);
        res.status(400).json({ success, errors: error });
      }
    });

    router.post("/refresh", async (req, res) => {
      const { refreshToken } = req.body;
    
      if (!refreshToken) {
        return res.status(401).json({ success: false, error: "No refresh token provided." });
      }
    
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECERT_KEY);
        const email = decoded.email;
        const tenantcode = decoded.tenantcode;
        // await Auth.init(tenantcode);
        const companyData = await Company.findByEmail(email);
      let tCode = companyData?.tenantcode;
      await Auth.init(tCode);
  

        const userRec = await Auth.findByEmail(email); 
        if (!userRec) {
          return res.status(401).json({ success: false, error: "Invalid credentials, please log in again." });
        }
    
        const userInfo = { ...userRec.userinfo };
        let username = userInfo.firstname + ' ' + userInfo.lastname;
        userInfo.username = username;
        delete userInfo.password;
        const newAuthToken = jwt.sign(userInfo, process.env.JWT_SECRET, { expiresIn: "5h" });
        return res.status(200).json({
          success: true,
          authToken: newAuthToken,
          refreshToken: refreshToken,
        });
      } catch (error) {
        console.error("Error verifying refresh token:", error);
        return res.status(403).json({ success: false, error: "Invalid or expired refresh token." });
      }
    });
    

  router.put("/updatepassword", fetchUser, async (req, res) => {
    try {
      //Check permissions
      // #swagger.tags = ['Users']
      // #swagger.path = ['/api/auth/updatepassword']
      const { password } = req.body;
      const errors = [];
      const userRec = {};
      const salt = bcrypt.genSaltSync(10);
      const secPass = bcrypt.hashSync(req.body.password, salt);
      if (req.body.hasOwnProperty("password")) { userRec.password = secPass };
      //if(req.body.hasOwnProperty("id")){userRec.id = id};

      if (errors.length !== 0) {
        return res.status(400).json({ errors: errors });
      }
      await Auth.init(req.userinfo.tenantcode);
      let resultUser = await Auth.findById(req.userinfo.id);

      if (resultUser) {
        resultLead = await Auth.updateById(req.userinfo.id, userRec);
        if (resultLead) {
          return res.status(200).json({ "success": true, "message": "Record updated successfully" });
        }
        // return res.status(200).json(resultLead);


      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }


    } catch (error) {
      console.log('error:', error);
      res.status(400).json({ errors: error });
    }

  });

  // Get user by Id
  router.get("/users/:id/:tenant", fetchUser,
    async (req, res) => {
      // #swagger.tags = ['Users']
      // #swagger.path = ['/api/auth/users/:id']
      try {
        if(req.userinfo.userrole = 'SYS_ADMIN'){
          console.log("req.userinfo")
          await Auth.init(req.params.tenant);
        }else{
          console.log("req.userinforeq.userinforeq.userinforeq.userinfo")
          await Auth.init(req.userinfo.tenantcode);
        }
        const userRec = await Auth.findById(req.params.id);

        if (!userRec) {
          return res.status(400).json({ errors: "User not found" });
        }

        return res.status(200).json(userRec);

      } catch (error) {
        res.status(400).json({ errors: error });
      }
      // contacts.create(req, res);
    });

  router.put("/:id/profile", fetchUser, async (req, res) => {
    try {
      const MIMEType = new Map([
        ["text/csv", "csv"],
        ["application/msword", "doc"],
        ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
        ["image/gif", "gif"],
        ["text/html", "html"],
        ["image/jpeg", "jpg"],
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
        ["application/xml", "xml"],
        ["application/zip", "zip"]
      ]);

      File.init(req.userinfo.tenantcode);
      Auth.init(req.userinfo.tenantcode);
      const resultFile = await File.findByParentId(req.params.id);

      if (resultFile && resultFile.length > 0) {
        for (const file of resultFile) {
          const { id: fileId, parentid: parentId } = file;
          const filePath = `${process.env.FILE_UPLOAD_PATH}/${req.userinfo.tenantcode}/users/${parentId}`;

          if (fs.existsSync(filePath)) {
            const deletionResult = await File.deleteFile(fileId);

            if (deletionResult) {
              fs.unlinkSync(filePath); // Remove the actual file
            } else {
              return res.status(400).json({ success: false, message: "Failed to delete the record." });
            }
          } else {
            console.log('File path does not exist:', filePath);
          }
        }
      }

      // Process new file upload
      const pdfreference = req?.files?.file;
      if (pdfreference) {
        const newVersionRecord = JSON.parse(JSON.parse(req.body.staffRecord));
        await Auth.init(req.userinfo.tenantcode);
        const resultObj = await Auth.findById(req.userinfo.id);

        if (resultObj) {
          const updateResult = await Auth.updateRecById(resultObj.id, newVersionRecord, req.userinfo.id);
          if (!updateResult) return res.status(400).json({ errors: "Bad Request" });

          const newFileRecord = {
            title: pdfreference.name,
            filetype: MIMEType.get(pdfreference.mimetype) || pdfreference.mimetype,
            parentid: resultObj.id,
            filesize: pdfreference.size,
            description: "Outgoing",
          };

          const fileRec = await File.insertFileRecords(newFileRecord, req.userinfo.id);
          const uploadPath = `${process.env.FILE_UPLOAD_PATH}/${req.userinfo.tenantcode}/users`;
          const filePath = `${uploadPath}/${fileRec.parentid}`;

          // Ensure the upload directory exists
          if (!fs.existsSync(uploadPath)) {
            await fs.promises.mkdir(uploadPath, { recursive: true });
          }

          // Move the file
          pdfreference.mv(filePath, (err) => {
            if (err) {
              console.error('Error moving file:', err);
              return res.status(500).json({ error: "Error moving file." });
            }
            return res.status(200).json(updateResult);
          });
        }
      } else {
        return res.status(400).json({ error: "No file uploaded." });
      }
    } catch (error) {
      console.error("An error occurred while processing the request:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });

  //......................................Update User.................................
  router.put("/:id", fetchUser, async (req, res) => {
    try {
      //Check permissions

      // #swagger.tags = ['Users']
      // #swagger.path = ['/api/auth/:id']
      const { firstname, lastname, email, userrole, password, isactive, managerid, whatsapp_number, whatsapp_settings } = req.body;
      const errors = [];
      const userRec = {};

      if (req.body.hasOwnProperty("firstname")) { userRec.firstname = firstname; if (!firstname) { errors.push('Firstname is required') } };
      if (req.body.hasOwnProperty("lastname")) { userRec.lastname = lastname; if (!lastname) { errors.push('Lastname is required') } };
      if (req.body.hasOwnProperty("email")) { userRec.email = email; if (!email) { errors.push('Email is required') } };
      if (req.body.hasOwnProperty("password")) { userRec.password = password; if (!password) { errors.push('Password is required') } };
     
      if (req.body.hasOwnProperty("whatsapp_number")) { userRec.whatsapp_number = whatsapp_number };

      if (req.body.hasOwnProperty("userrole")) { userRec.userrole = userrole };
      if (req.body.hasOwnProperty("isactive")) { userRec.isactive = isactive };
      if (req.body.hasOwnProperty("managerid")) { userRec.managerid = managerid };
      if (req.body.hasOwnProperty("whatsapp_settings")) { userRec.whatsapp_settings = JSON.stringify(whatsapp_settings); }

      if (errors.length !== 0) {
        return res.status(400).json({ errors: errors });
      }
      await Auth.init(req.userinfo.tenantcode);
      const duplicateUser = await Auth.checkForDuplicate(email, whatsapp_number, req.params.id);

      if (duplicateUser) {
        if (duplicateUser.email === email) {
          return res.status(400).json({ errors: "Email already exists" });
        } else if (duplicateUser.whatsapp_number === whatsapp_number) {
          return res.status(400).json({ errors: "WhatsApp number already exists" });
        }
      }


      let resultUser = await Auth.findById(req.params.id);

      if (resultUser.userrole === 'SYS_ADMIN' && req.params.id !== req.userinfo.id) {
        return res.status(400).json({ errors: "You cannot edit system admin" });
      }

      if (resultUser) {

        // if (req.body.hasOwnProperty("isactive") && isactive === true) {
        //   const allowedLicenses = await Auth.checkLicenses(req.userinfo.companyid, resultUser.id);
        //   if (!allowedLicenses) {
        //     return res.status(400).json({ errors: "Licenses limit exceeded" });
        //   }
        // } else 
        if (req.body.hasOwnProperty("isactive") && isactive === false
          && req.params.id === req.userinfo.id) {

          return res.status(400).json({ errors: "You cannot deactivate yourself" });

        }
        if (req.body.hasOwnProperty("password")) {
          const salt = bcrypt.genSaltSync(10);
          const secPass = bcrypt.hashSync(req.body.password, salt);
          userRec.password = secPass;
        }


        resultUser = await Auth.updateRecById(req.params.id, userRec, req.userinfo.id);
        if (resultUser) {
          if (resultUser.isError)
            return res.status(400).json({ "success": false, errors: resultUser.errors });
          else
            return res.status(200).json({ "success": true, "message": "Record updated successfully" });
        }
        return res.status(200).json(resultUser);


      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }


    } catch (error) {
      console.log('error:', error);
      res.status(400).json({ errors: error });
    }

  });

  // Create a new Tutorial
  router.get("/getuser", fetchUser,

    async (req, res) => {

      try {
        const userid = req.userinfo.id;
        await Auth.init(req.userinfo.tenantcode);
        const userRec = await Auth.findById(userid);

        if (!userRec) {
          return res.status(400).json({ errors: "User not found" });
        }

        return res.status(200).json(userRec);

      } catch (error) {
        res.status(400).json({ errors: error });
      }
      // contacts.create(req, res);

    });


  // Fetch all Users
  router.get("/users", fetchUser,

    async (req, res) => {
      // #swagger.tags = ['Users']
      // #swagger.path = ['/api/auth/users']
      try {
        await Auth.init(req.userinfo.tenantcode);

        const userRec = await Auth.findAll(req.userinfo);
        if (!userRec) {
          return res.status(200).json({ errors: "User not found" });
        }
        return res.status(200).json(userRec);

      } catch (error) {
        res.status(400).json({ errors: error });
      }
      // contacts.create(req, res);

    });

  // ................................................Download file .......................................
  router.get("/myimage", fetchUser, async (req, res) => {
    try {
      //const filePath = "D:/Files/" + parentId +"/"+ fileId + '.' + fileType;
      let filePath = process.env.FILE_UPLOAD_PATH  + "/"+ req.userinfo.tenantcode + "/users/" + req.userinfo.id;
      res.download(filePath, "myprofileimage", function (err) {

        if (err) {
          return res.status(400).json({ "Error": false, "message": err });
        }
      });
    } catch (error) {
      console.log('System Error:', error);
      return res.status(400).json({ "Error": false, "message": error });
    }
  });

  // ................................................Download file .......................................
  router.get("/userimage/:id", async (req, res) => {
    try {

      //const filePath = "D:/Files/" + parentId +"/"+ fileId + '.' + fileType;
      let filePath = process.env.FILE_UPLOAD_PATH + "/" + req.params.id;
      res.download(filePath, req.params.id, function (err) {
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

  // Get user by Id
  router.get("/managers", fetchUser,

    async (req, res) => {
      // #swagger.tags = ['Users']
      // #swagger.path = ['/api/auth/managers']
      try {
        await Auth.init(req.userinfo.tenantcode);
        const userRecList = await Auth.getAllManager();
        if (!userRecList) {
          return res.status(400).json({ errors: "User not found" });
        }

        return res.status(200).json(userRecList);

      } catch (error) {
        res.status(400).json({ errors: error });
      }

    });

  app.use(process.env.BASE_API_URL + '/api/auth', router);
};
