/**
 * Handles all incoming request for /api/company endpoint
 * DB table for this public.company
 * Model used here is company.model.js
 * SUPPORTED API ENDPOINTS
 *              GET     /api/company
 *              GET     /api/company/:id
 *              POST    /api/company
 *              PUT     /api/company/:id
 *              DELETE  /api/company/:id
 * 
 * @author      Shivani mehra
 * @date        dec, 2023
 * @copyright   www.ibirdsservices.com  
 */

const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const Company = require("../models/company.model.js");

const fs = require('fs');
const permissions = require("../constants/permissions.js");
const bcrypt = require('bcryptjs');
const fileUpload = require("express-fileupload");
const { sendEmail } = require("../models/mail.model.js");
module.exports = app => {


  const { body, validationResult } = require('express-validator');

  var router = require("express").Router();

  //Company Find By Id
  router.get("/:id", fetchUser, async (req, res) => {
    const companyResult = await Company.findById(req.params.id);
    if (!companyResult) {
      return res.status(400).json({ errors: "Not Exist..!!" });
    }
    return res.status(200).json(companyResult);
  })

  router.get("/:?", async (req, res) => {
    const { is_active } = req.query;

    const companyResults = await Company.findAllCompany(is_active);
    if (!companyResults) {
      return res.status(200).json([]);
    }
    return res.status(200).json(companyResults);
  })

  // ................................ Create a new Company  With File Uploading ................................

  router.post("/", async (req, res) => {
    
    let requestBody = JSON.parse(req.body.request);
    let times = 0;
    if (!req.files) { return res.status(400).json({ errors: "No File selected" }); }
    let filePathObj = {};

    for (const f in req.files) {
      const fileDetail = req.files[f];

      let uploadPath = process.env.FILE_UPLOAD_PATH + "/" + requestBody['company_info']['tenantcode'];
      filePath = uploadPath + '/' + fileDetail.name;
      // filePathObj[f]  =  filePath.replace("/var/www/html" , "https://iwhatsup.com");
      filePathObj[f] = filePath;
      try {
        //Check file exists
        if (fs.existsSync(uploadPath)) {
          fileDetail.mv(filePath, (err, res) => {
            if (err) {
              return res.send(err);
            }
          });
        }
        else {
          //if not exists then create directory
          if (times === 0) {
            // console.log("if uploadPath  --- ", uploadPath);
            fs.mkdirSync(uploadPath, { recursive: true }); times++;
          }
          fileDetail.mv(filePath, (err, res) => {
            if (err) {
              return res.send(err);
            }
          })
        }
      } catch (e) {
        console.log("An error occurred.", e);
        return res.status(400).json({ errors: error.message });
      }
    }

    //Find SYS_ADMIN user role.
    const userRoleResult = await Company.findUserRole('SYS_ADMIN');
    if (!userRoleResult) {
      return res.status(400).json({ errors: "System Admin User Role Not Exist..!!" });
    }

    let reqBody = { ...requestBody, userRoleResult };
    let password = requestBody['user_info']['password'];
    const salt = bcrypt.genSaltSync(10);
    const cryptPassword = bcrypt.hashSync(password, salt);

    // reqBody['company_info']['logourl'] = filePathObj.logo;
    fPath = filePath.replace(process.env.FRONTEND_PATH, process.env.BASE_URL);
    // reqBody['company_info']['logourl'] = filePathObj.logo;
    fPath = filePath.replace(process.env.FRONTEND_PATH, process.env.BASE_URL);

    reqBody['company_info']['logourl'] = fPath;
    reqBody['company_info']['logourl'] =  fPath;
    await Company.createCompanyWithUser(reqBody, cryptPassword).then((result) => {
      if (!result) {
        return res.status(400).json({ errors: "Bad Request" });
      }
      // Company.sendeMail(requestBody['user_info']['email'], requestBody['user_info']['password']);
      const emailData = {
        username: requestBody['user_info']['email'],
        password: requestBody['user_info']['password']
      };
      // sendEmail(requestBody['user_info']['email'], emailData, null, 'register_mail');

      return  res.status(200).json({ success: true, records: result });
    }).catch((error) => {
      console.log('error : ', error.message);
      return res.status(400).json({ errors: error.message });
    })
  });

  // ................................ Create a new Company ................................

  //  router.post("/",  async (req, res)=>{

  //     //Find SYS_ADMIN user role.
  //     const userRoleResult =  await Company.findUserRole('SYS_ADMIN');
  //     if(!userRoleResult){
  //         return res.status(400).json({errors : "System Admin User Role Not Exist..!!"});
  //     }

  //     let reqBody = {...req.body , userRoleResult};
  //     let password = reqBody['user_info']['password'];
  //     const salt = bcrypt.genSaltSync(10);
  //     const cryptPassword = bcrypt.hashSync(password, salt);


  //     await Company.createCompanyWithUser(reqBody, cryptPassword).then((result) => {
  //         if(!result){
  //           return res.status(400).json({errors : "Bad Request"});
  //         }
  //         return res.status(200).json({data : result , message : "Successfully User Created..!!"});
  //     }).catch((error) =>{
  //       console.log('error : ' , error.message);
  //         return res.status(400).json({errors : error.message});
  //     })


  //   });

  router.get("/all/getschema", fetchUser, async (req, res) => {
    const sourceSchemaResult = await Company.getSourceSchemas();
    if (!sourceSchemaResult) {
      return res.status(400).json({ errors: "Not Exist..!!" });
    }
    return res.status(200).json({ sourceSchemaResult });
  })

  // Create by Abhishek: To fetch Company Detail with User Info
  router.get("/detail/:id", fetchUser, async (req, res) => {
    const companyResult = await Company.findCompanyWithUser(req.params.id);
    if (!companyResult) {
      return res.status(400).json({ errors: "Not Exist..!!" });
    }
    return res.status(200).json({ companyResult });
  })

  // Create by Abhishek: To Update Company Detail with User Info
  router.put("/updateCompanyWithUser/", fetchUser, async (req, res) => {
    let requestBody = JSON.parse(req.body.request);
    let times = 0;
    // if (!req.files) { return res.status(400).json({ errors: "No File selected" }); }
    
    let reqBody = {...requestBody};

    if (req.files) { 
      var filePathObj = {};
      for (const f in req.files) {
        const fileDetail = req.files[f];

        let uploadPath = process.env.FILE_UPLOAD_PATH + "/" + requestBody['company_info']['tenantcode'];
        filePath = uploadPath + '/' + fileDetail.name;
        // filePathObj[f]  =  filePath.replace("/var/www/html" , "https://iwhatsup.com");
        filePathObj[f] = filePath;
        try {
          //Check file exists
          if (fs.existsSync(uploadPath)) {
            fileDetail.mv(filePath, (err, res) => {
              if (err) {
                return res.send(err);
              }
            });
          }
          else {
            //if not exists then create directory
            if (times === 0) {
              // console.log("if uploadPath  --- ", uploadPath);
              fs.mkdirSync(uploadPath, { recursive: true }); times++;
            }
            fileDetail.mv(filePath, (err, res) => {
              if (err) {
                return res.send(err);
              }
            })
          }
        } catch (e) {
          // console.log("An error occurred.", e);
          return res.status(400).json({ errors: error.message });
        }
      }

      // reqBody['company_info']['logourl'] = filePathObj.logo;
      fPath = filePath.replace(process.env.FRONTEND_PATH, process.env.BASE_URL);

      reqBody['company_info']['logourl'] =  fPath;
      // reqBody['company_info']['logourl'] = filePathObj.logo;
      fPath = filePath.replace(process.env.FRONTEND_PATH, process.env.BASE_URL);

      reqBody['company_info']['logourl'] = fPath;
    }
    // console.log('filePathObj ', filePathObj);

    //Find SYS_ADMIN user role.
    const userRoleResult = await Company.findUserRole('SYS_ADMIN');
    if (!userRoleResult) {
      return res.status(400).json({ errors: "System Admin User Role Not Exist..!!" });
    }
    
    // console.log(reqBody);

    await Company.updateCompanyWithUser(reqBody).then((result) => {
      if (!result) {
        return res.status(400).json({ errors: "Bad Request" });
      }
      return    res.status(200).json({ success: true, records: result });
    }).catch((error) => {
      console.log('error : ', error.message);
      return res.status(400).json({ errors: error.message });
    })
  });

  router.get('/send/mail/', fetchUser, async (req, res) =>{
    let result = await Company.sendeMail('abhishek.sharma@gmail.com', "hkh@234");

    return res.status(200).json({result});
  });

  router.put("/:id", fetchUser, async (req, res) => {
    // const planId = req.params.id;
    const companyData = req.body;
    const result = await Company.updateById(companyData);

    if (result) {
      return res.status(200).json({ success: true, message: "Company Status Updated Successfully" });
    }
    return res.status(200).json(result);
  });

  router.post("/emailcheck", async (req, res) => {
    const { email, userId } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
  
    try {
      const emailResults = await Company.duplicateEmailCheck(email, userId);  
      if (!emailResults) {
        return res.status(200).json({ success: false });  
      }
      return res.status(200).json({ success: true });  
    } catch (error) {
      console.error('Error checking email:', error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });  
    }
  });
  
  router.post("/createcompany", async (req, res) => {
    
    let requestBody = JSON.parse(req.body.request);
    let times = 0;
    if (!req.files) { return res.status(400).json({ errors: "No File selected" }); }
    let filePathObj = {};

    for (const f in req.files) {
      const fileDetail = req.files[f];

      let uploadPath = process.env.FILE_UPLOAD_PATH + "/" + requestBody['company_info']['tenantcode'];
      filePath = uploadPath + '/' + fileDetail.name;
      // filePathObj[f]  =  filePath.replace("/var/www/html" , "https://property.indicrm.io");
      console.log('File Path:', filePath);
      filePathObj[f] = filePath;
      try {
        //Check file exists
        if (fs.existsSync(uploadPath)) {
          fileDetail.mv(filePath, (err, res) => {
            if (err) {
              return res.send(err);
            }
          });
        }
        else {
          //if not exists then create directory
          if (times === 0) {
            // console.log("if uploadPath  --- ", uploadPath);
            fs.mkdirSync(uploadPath, { recursive: true }); times++;
          }
          fileDetail.mv(filePath, (err, res) => {
            if (err) {
              return res.send(err);
            }
          })
        }
      } catch (e) {
        console.log("An error occurred.", e);
        return res.status(400).json({ errors: error.message });
      }
    }

    //Find SYS_ADMIN user role.
    const userRoleResult = await Company.findUserRole('SYS_ADMIN');
    if (!userRoleResult) {
      return res.status(400).json({ errors: "System Admin User Role Not Exist..!!" });
    }

    let reqBody = { ...requestBody, userRoleResult };
    let password = requestBody['user_info']['password'];
    const salt = bcrypt.genSaltSync(10);
    const cryptPassword = bcrypt.hashSync(password, salt);
    fPath = filePath.replace(process.env.FRONTEND_PATH, process.env.BASE_URL);

    // requestBody['company_info']['logourl'] = filePathObj.logo;
    fPath = filePath.replace(process.env.FRONTEND_PATH, process.env.BASE_URL);
    requestBody['company_info']['logourl'] = fPath;

    requestBody['company_info']['logourl'] = fPath;
    await Company.createCompanyWithUser(reqBody, cryptPassword).then((result) => {
      if (!result) {
        return res.status(400).json({ errors: "Bad Request" });
      }

      // Company.sendeMail(requestBody['user_info']['email'], requestBody['user_info']['password']);
      return  res.status(200).json({ success: true, records: result });
    }).catch((error) => {
      console.log('error : ', error.message);
      return res.status(400).json({ errors: error.message });
    })
  });


  app.use(process.env.BASE_API_URL + '/api/company', router);
};
