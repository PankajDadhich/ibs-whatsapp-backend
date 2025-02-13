const e = require("express");
const fs = require("fs");
const PDFDocument = require('pdfkit'); //npm install pdfkit
const moment = require('moment');

const { fetchUser } = require("../middleware/fetchuser.js");

const Mailer = require("../models/mail.model.js");
const Company = require("../models/company.model.js");

// const permissions = require("../constants/permissions.js");

module.exports = (app) => {
  //   ---------------------Get All---------------------------

  const { body, validationResult } = require("express-validator");

  var router = require("express").Router();

  router.post("/invoice/", fetchUser, async (req, res) => {
    const request = req.body;
    let base64 = request.imgData.replace(/^data:image\/[a-z]+;base64,/, "");


    const invoiceData = request.invoiceData;

    const companyResult = await Company.findCompanyWithUser(invoiceData.company_id);

    const doc = new PDFDocument();
    const pdfPath = './public/invoices/'+invoiceData?.id+'.pdf';

    doc.pipe(fs.createWriteStream(pdfPath));

    const pageWidth = doc.page.width;

    const imgWidth = pageWidth;
    // const imgHeight = (imgWidth * 0.5);

    let base64String = Buffer.from(base64, 'base64');
    doc.image(base64String, 0, 0, { width: imgWidth });

    doc.end();

    let to = companyResult[0]?.adminemail;
    let subject = 'Invoice Remainder Mail';
    let url = `http://localhost:3000/invoice/pay/${invoiceData?.id}`

    let body = `<html><body style="font-family: system-ui;"><div style="padding: 0px 10px;background-color: #F9F9F9;border: 2px solid #E0E0E0;width: 75%; display: block; margin: 0 auto;"><p>Dear${' ' + companyResult[0]?.firstname + ' ' + companyResult[0]?.lastname},</p><p>I hope this email finds you well. This is a friendly reminder that your invoice #${invoiceData?.invoice_no}, dated ${moment(invoiceData?.invoice_date).format('DD-MM-YYYY')}, is currently pending payment. We kindly request that the payment be made at your earliest convenience.</p><h4>Invoice Details:</h4><ul type="disc"><li>Invoice Number: ${invoiceData?.invoice_no}</li><li>Invoice Date: ${moment(invoiceData?.invoice_date).format('DD-MM-YYYY')}</li><li>Amount Due: ${invoiceData?.total_amount}</li><li>Due Date: ${moment(invoiceData?.payment_due_date).format('DD-MM-YYYY')}</li></ul><p>To make the payment, please click on the link below:</p><button style="border: none; border-radius: 5%; padding: 8px 15px; background-color: #357ABD; color: #000 !important;"><a href="${url}" style="text-decoration: none;color: #fffafa;">Pay Now</a></button><p>For your reference, a copy of the invoice is attached to this email.</p><p>If you have any questions or concerns regarding this invoice, please don’t hesitate to reach out to us at contact@ibirdsservices.com or call us at 9876543210.</p><p>We appreciate your prompt attention to this matter. Thank you for your continued business.</p><p><b>Best regards,</b><br>iBirds Software Services pvt. ltd.</p></div></body></html>`;

    let data = {
      name: companyResult[0]?.firstname + ' ' + companyResult[0]?.lastname,
      invoice_no: invoiceData?.invoice_no,
      invoice_date: moment(invoiceData?.invoice_date).format('DD-MM-YYYY'),
      total_amount: invoiceData?.total_amount,
      payment_due_date: moment(invoiceData?.payment_due_date).format('DD-MM-YYYY'),
      url: url
    }

    if(companyResult[0]?.adminemail){
      const result = await Mailer.sendEmail(to, data, '', "pending_invoice", pdfPath);
      fs.unlinkSync(pdfPath);
      res.status(200).json({success: true, result});
    }
  });

  app.use(process.env.BASE_API_URL + "/api/mail", router);
};
