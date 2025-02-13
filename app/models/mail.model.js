const nodemailer = require('nodemailer');
const fs = require("fs");

const { emailTemplate } = require("../templates/email.template.js");

async function sendEmail(to, data, subject=null, templateName=null, attachment=null, body=null, fromEmail='no-reply@ibirdsservices.com'){
    try{
        var message = '';
        let mailTransporter = nodemailer.createTransport({
            // host: process.env.SMTP_HOST,
            // port: process.env.SMTP_PORT,
            // secure : true,
            // auth: {
            //     user: process.env.SMTP_EMAIL,
            //     pass: process.env.SMTP_EMAIL_PWD
            // },
            // tls:{
            //     rejectUnauthorized:false
            // },
            service: 'gmail',
            auth: {
                user: 'abhishek.sharma@ibirdsservices.com',
                pass: 'abhishek@108yash'
            }
        });

        var tempSubject = subject;
        var tempBody = body;
        if(templateName){
            let templateData = await emailTemplate(templateName, data);
            tempSubject = templateData.subject;
            tempBody = templateData.body;
        }

        let mailDetails = {
            from: fromEmail,
            to: to,
            subject: tempSubject,
            text: tempBody.replace(/(?:<|(?<=\p{EPres}))[^>\p{EPres}]+(?:>|(?=\p{EPres}))/gu, ""),
            html: tempBody
        };    
        
        if(attachment){
            mailDetails.attachments = [{
                filename: 'attachment.pdf',
                contentType: 'application/pdf',
                content: fs.createReadStream(attachment)
            }];
        }
    
        // console.log('Mail-Detail: ', mailDetails);
        const mailResult = await mailTransporter.sendMail(mailDetails);
        return "Email Sent Successfully";
    }catch(error){
        console.log(error.message);
        return error.message
    }
}


module.exports = {sendEmail};