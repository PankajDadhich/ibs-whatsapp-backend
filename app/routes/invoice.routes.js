/**
 * @author      Abhishek Sharma
 * @date        27-05-2024
 */

const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const Invoice = require("../models/invoice.model.js");
const permissions = require("../constants/permissions.js");
const bcrypt = require('bcryptjs');

const crypto = require('crypto');
const Mailer = require("../models/mail.model.js");
const moment = require("moment"); 
const Auth = require("../models/auth.model.js")
function generateHmacSha256(message, secret) {
  return crypto.createHmac('sha256', secret)
               .update(message)
               .digest('hex'); // You can also use 'base64' if you prefer
}

module.exports = (app) => {
  //   ---------------------Get All---------------------------

  const { body, validationResult } = require("express-validator");

  var router = require("express").Router();

  router.get("/:?", fetchUser, async (req, res) => {
    const { status } = req.query;
    const result = await Invoice.findAll(status);
    console.log(result);
    if (result) {
      res.status(200).json(result);
    } else {
      res.status(400).json({ errors: "No data" });
    }
  });

  router.get("/company/:id", fetchUser, async (req, res) => {
    const companyId = req.params.id;
    const result = await Invoice.fetchByCompanyId(companyId);
    if (result) {
      res.status(200).json(result);
    } else {
      res.status(400).json({ errors: "No data" });
    }
  });

  router.get("/:id", fetchUser, async (req, res) => {
    const id = req.params.id;
    const response = await Invoice.fetchInvoiceById(id);
    if (response) {
      res.status(200).json(response);
    } else {
      res.status(400).json({ errors: "No data" });
    }
  });

  // router.post("/", fetchUser, async (req, res) => {
  //   try {
  //     const record = await Invoice.addInvoice(req.body);
  //     console.log(record, !record);
  //     if (!record) {
  //       return res.status(200).json({ message: "Record Not Created" });
  //     }
  //     return res.status(200).json({ success: true, record: record });
  //   }
  //   catch (error) {
  //     console.error("Error processing the request:", error);
  //     return res.status(500).json({ errors: "Internal Server Error" });
  //   }
  // });

  router.post("/invoiceWithTransaction", fetchUser, async (req, res) => {
    try {

      const invoiceData = req.body;
      if(invoiceData.payment_method != 'cash'){
        let razorpayOrderId = invoiceData.order_id;
        let razorpayPaymentId = invoiceData.transaction_cheque_no;
        let signature = invoiceData.signature;

        // Create a message to sign
        const message = `${razorpayOrderId}|${razorpayPaymentId}`;

        // Generate HMAC SHA-256
        const generated_signature = generateHmacSha256(message, "9chLmlIYdBxmrQqqqJDjByUi");

        if(generated_signature === signature){
          console.log('true');
        }else{
          console.log('false');
        }
      }
      

      const record = await Invoice.addInvoiceWithTransaction(req.body);
      if (!record) {
        return res.status(200).json({ message: "Record Not Created" });
      }
      return res.status(200).json({ success: true, record: record });
    }
    catch (error) {
      console.error("Error processing the request:", error);
      return res.status(500).json({ errors: "Internal Server Error" });
    }
  });

  router.get("/i/:id", fetchUser, async (req, res) => {
    const id = req.params.id;
    await Invoice.init(req.userinfo.tenantcode);
    const response = await Invoice.fetchCompanyAndUserByInvoice(id);
    // console.log('I response --- ', response);

    let record = [
      {
        company: {
          company_id: response[0].company_id,
          company_name: response[0].company_name,
          tenantcode: response[0].tenantcode,
          sourceschema: response[0].sourceschema,
          // userlicenses: response[0].userlicenses,
          isactive: response[0].isactive,
          systememail: response[0].systememail,
          adminemail: response[0].adminemail,
          // logourl: response[0].logourl,
          city: response[0].city,
          street: response[0].street,
          pincode: response[0].pincode,
          state: response[0].state,
          country: response[0].country,
          user_id: response[0].user_id,
          firstname: response[0].firstname,
          lastname: response[0].lastname,
          password: response[0].password,
          email: response[0].email,
          whatsapp_number: response[0].whatsapp_number
        },
        invoice: {
          id: response[0].id,
          company_id: response[0].company_id,
          subscription_id: response[0].subscription_id,
          plan_id: response[0].plan_id,
          plan_name: response[0].plan_name,
          start_date: response[0].start_date,
          end_date: response[0].end_date,
          validity: response[0].validity,
          invoice_date: response[0].invoice_date,
          date: response[0].invoice_date,
          amount: response[0].total_amount,
          status: response[0].status,
          new_name: response[0].other_name,
          invoice_no: response[0].invoice_no,
          due_date: response[0].due_date,
          transaction_cheque_no: '',
          payment_method: '',
        }
      }
    ]
    if (record) {
      res.status(200).json(record);
    } else {
      res.status(400).json({ errors: "No data" });
    }
  });

  router.put("/updateInvoiceAddTrans/:id", fetchUser, async (req, res) => {
    const invoiceId = req.params.id;
    const invoiceData = req.body;
    let companyData = invoiceData.company;
    const isFirstInvoice = !(await Invoice.hasExistingInvoices(companyData.company_id));

      delete invoiceData.company;
    if(invoiceData.payment_method != 'cash'){
      let razorpayOrderId = invoiceData.order_id;
      let razorpayPaymentId = invoiceData.transaction_cheque_no;
      let signature = invoiceData.signature;
  
      
      // Create a message to sign
      const message = `${razorpayOrderId}|${razorpayPaymentId}`;
  
      // Generate HMAC SHA-256
      const generated_signature = generateHmacSha256(message, "9chLmlIYdBxmrQqqqJDjByUi");
  
      if(generated_signature === signature){
        console.log('true');
      }else{
        console.log('false');
      }
    }
   

    // return null;
    const result = await Invoice.updateInvoiceAddTrans(invoiceId, invoiceData);
    if (result) {

      let to = companyData.adminemail;
      let subject = "Payment Confirmation";
      let body = `<html><body style="font-family: system-ui;"><div style="padding: 0px 10px;background-color: #F9F9F9;border: 2px solid #E0E0E0;width: 75%; display: block;margin: 0 auto;"><p>Dear${' '+companyData.firstname+' '+companyData.lastname},</p><p>Thank you for your payment!</p><p>We are pleased to inform you that your payment of ${invoiceData.amount} for <b>Watconnect</b> has been successfully processed on ${moment(invoiceData.date).format('DD-MM-YYYY')}.</p><p>Please find your invoice attached to this email for your records.</p><h4>Payment Details:</h4><ul type="disc"><li>Payment Amount: ${invoiceData.amount}</li><li>Payment Date: ${moment(invoiceData.date).format('DD-MM-YYYY')}</li><li>Payment Method: ${invoiceData.payment_method}</li>${invoiceData.payment_method !== 'cash'? `<li>Transaction ID: ${invoiceData.transaction_cheque_no || ''}</li>`: ''}
      </ul>${invoiceData.payment_method !== 'cash'? `<h4>Order Details:</h4><ul type="disc"><li>Order ID: ${invoiceData.order_id || ''}</li><li>Product/Service: <b>Watconnect</b></li></ul>`: ''}<h4>Order Details:</h4><ul type="disc"><li>Order ID: ${invoiceData.order_id}</li><li>Product/Service: <b>Watconnect</b></li></ul><p>If you have any questions or need further assistance, please feel free to contact us at contact@ibirdsservices.com or call us at 9876543210.</p><p>Thank you for choosing iBirds Software Services Pvt. Ltd.. We appreciate your business!</p><p>Best regards,<br>iBirds Software Services Pvt. Ltd.<p></div></body></html>`;

      // const data = {
      //   name: companyData.firstname+' '+companyData.lastname,
      //   amount: invoiceData.amount,
      //   date: moment(invoiceData.date).format('DD-MM-YYYY'),
      //   payment_method: invoiceData.payment_method,
      //   transaction_cheque_no: invoiceData.transaction_cheque_no,
      //   order_id: invoiceData.order_id,
      // }

      if (isFirstInvoice) {
        try {
          const password =  companyData.company_name.toLowerCase().replace(/\s+/g, '') + '#$@' + Math.floor(Math.random() * 1000 + 100);
          const salt = bcrypt.genSaltSync(10);
          const cryptPassword = bcrypt.hashSync(password, salt);
      
          let userRec = {
            password: cryptPassword,
          };
          Auth.init(companyData.tenantcode);
         const resultpassword =  await Auth.updateById(companyData.user_id, userRec);
         console.log("resultpassword",resultpassword);
          const emailData = {
            name: companyData.tenantcode,
            username: companyData.adminemail,
            password: password,
            url: process.env.BASE_URL
          };
      
          await Mailer.sendEmail(companyData.adminemail, emailData, null, 'register_mail');
        } catch (error) {
          console.error("Error processing first invoice registration:", error);
          // throw new Error("Failed to process first invoice registration");
        }
      }
      

      const data = {
        name: companyData.firstname+' '+companyData.lastname,
        amount: invoiceData.amount,
        date: moment(invoiceData.date).format('DD-MM-YYYY'),
        payment_method: invoiceData.payment_method || '--',
        transaction_cheque_no: invoiceData.transaction_cheque_no || '--',
        order_id: invoiceData.order_id || '--',
      }

      const result = await Mailer.sendEmail(to, data, '', "complete_invoice");

      return res.status(200).json({ success: true, message: "Transaction Created successfully" });
    }
    return res.status(200).json(result);
  });

  router.put("/:id", fetchUser, async (req, res) => {
    const invoiceId = req.params.id;
    const invoiceData = req.body;
    const result = await Invoice.updateInvoice(invoiceId, invoiceData);
    if (result) {
      return res.status(200).json({ success: true, message: "Invoice Updated successfully" });
    }
    return res.status(200).json(result);
  });

  //   ---------------------Get By Id---------------------------
  // router.get("/:id", fetchUser, async (req, res) => {
  //   try {
  //     // Check permissions
  //     const permission = req.userinfo.permissions.find(
  //       (el) =>
  //         el.name === permissions.VIEW_LEAD ||
  //         el.name === permissions.MODIFY_ALL ||
  //         el.name === permissions.VIEW_ALL
  //     );

  //     if (!permission) {
  //       return res.status(401).json({ errors: "Unauthorized" });
  //     }

  //     const categoryId = req.params.id;
  //     Category.init(req.userinfo.tenantcode);
  //     const category = await Category.findByCategoryId(categoryId);
  //     if (category) {
  //       res.status(200).json(category);
  //     } else {
  //       res.status(404).json({ errors: "Category not found" });
  //     }
  //   } catch (error) {
  //     res.status(500).json({ errors: "Internal server error" });
  //   }
  // });


  //   ---------------------Create ---------------------------

  // router.post("/", fetchUser, async (req, res) => {
  //   try {
  //     const subscriptionRecord = await Subscription.createSubscription(req.body);
  //     if (!subscriptionRecord) {
  //       return res.status(200).json({ message: "This record already exists" });
  //     }
  //     return res.status(200).json({ success: true, record: subscriptionRecord });
  //   } catch (error) {
  //     console.error("Error processing the request:", error);
  //     return res.status(500).json({ errors: "Internal Server Error" });
  //   }
  // });

  //   ---------------------Update by Id---------------------------

  // router.put("/:id", fetchUser, async (req, res) => {
  //   const subscriptionId = req.params.id;
  //   const subscriptionData = req.body;
  //   const result = await Subscription.updateById(subscriptionId, subscriptionData);

  //   if (result) {
  //     return res.status(200).json({ success: true, message: "Record updated successfully" });
  //   }
  //   return res.status(200).json(result);
  // });


  //   ----------------------- Delete Category -------------------

  //  router.delete("/:id", fetchUser, async (req, res) => {
  //     const permission = req.userinfo.permissions.find(
  //       (el) =>
  //         el.name === permissions.DELETE_CONTACT ||
  //         el.name === permissions.MODIFY_ALL
  //     );
  //     if (!permission) return res.status(401).json({ errors: "Unauthorized" });

  //     Category.init(req.userinfo.tenantcode);
  //     const result = await Category.deleteById(req.params.id);
  //     if (!result)
  //       return res
  //         .status(200)
  //         .json({ success: false, message: "No record found" });

  //     res.status(200).json({ success: true, message: "Successfully Deleted" });
  //   });


  app.use(process.env.BASE_API_URL + "/api/invoice", router);
};
