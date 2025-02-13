const express = require("express");
const cron = require("node-cron");
const Backup = require("./app/models/backup.model.js");
const bodyParser = require("body-parser"); /* deprecated */
const cors = require("cors");
const http = require("http");
// const socketIo = require("socket.io");
const dotenv = require('dotenv').config();
// const sendbulkmsg = require("../backend/app/models/sendbulkmessage.model.js");

const sendbulkmsg = require("./app/models/sendbulkmessage.model.js");

const fileUpload = require('express-fileupload');
const fs = require('fs');
const app = express();
const Publicleads = require("./app/models/publicleads.model.js");
const Mailer = require("./app/models/mail.model.js");
const Company = require("./app/models/company.model.js");



app.set('view engine', 'ejs')

var corsOptions = {
  origin: "*",
  // methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  // allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.use(fileUpload());
app.use(express.json({ limit: '50mb' })); /* bodyParser.json() is deprecated */
app.use(express.urlencoded({ extended: true, limit: '50mb' })); /* bodyParser.urlencoded() is deprecated */

// simple route
app.get("/swp", (req, res) => {
  res.json({ message: "Welcome to bezkoder application." });
});



// set port, listen for requests
const PORT = process.env.PORT || 4004;
const server = http.createServer(app);
const io = require("socket.io")(server, { path: '/ibs/socket.io' });
// const io = require("socket.io")(server, {
//   path: '/ibs/socket.io',
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"]
//   }
// });

io.on("connection", (socket) => {
  console.log('connected to server');
  socket.on("setup", (userData) => {
    socket.join(userData.id);
    console.log('connected to server', userData.id);
    socket.emit("connected");
  })
})


require("./app/routes/auth.routes.js")(app);
require("./app/routes/common.routes.js")(app);
require("./app/routes/usertracking.routes.js")(app);
require("./app/routes/whatsappsetting.routes.js")(app);//Added by Abdul Pathan
require("./app/routes/messagehistory.routes.js")(app, io);//Added by Abdul Pathan
require("./app/routes/webhook.routes.js")(app, io);//Added by Abdul Pathan
require("./app/routes/campaign.routes.js")(app);//Added by Abdul Pathan
require("./app/routes/messagetemplate.routes.js")(app, io);//Added by Abdul Pathan
require("./app/routes/file.routes.js")(app);//Added by Abdul Pathan
require("./app/routes/lead.routes.js")(app); //Added by shivani
require("./app/routes/webhooktemplate.routes.js")(app);//Added by Abdul Pathan
require("./app/routes/whatsappmessage.routes.js")(app);//Added by Abdul Pathan
require("./app/routes/responsemessage.routes.js")(app);//Added by Abdul Pathan
require("./app/routes/groups.routes.js")(app);
require("./app/routes/module.routes.js")(app);
require("./app/routes/plan.routes.js")(app);
require("./app/routes/company.routes.js")(app);
require("./app/routes/invoice.routes.js")(app);
require("./app/routes/razorpay.routes.js")(app);
require("./app/routes/publicleads.routes.js")(app); // Add by Abhishek
require("./app/schedular/subscriptionRenewalSchedular.js"); // Add by Abhishek
require("./app/routes/mail.routes.js")(app); // Add by Abhishek

server.listen(PORT, () => {
  console.log(`##Server is running on port ${PORT}. ${process.env.BASE_API_URL}`);
});


cron.schedule("*/30 * * * * *", async function () {//every 5 mint
  // cron.schedule("*/50 * * * * *", async function () {
  // cron.schedule('0 5 * * *', async function () {
  // console.log('Running a task every 5 mints');
  try {
    // let tenants = 'ibs_meta_whatsapp';
    // let phoneNumber = '919530444240';
    let tenantcodes = await Company.getSourceSchemas();
    // console.log("tenantcodes",tenantcodes)
    for (const tenant of tenantcodes) {
      // console.log(`Processing tenant: ${tenant}`);

      const bulkResponse = await sendbulkmsg.sendBulkMessage(tenant);
      // console.log('Bulk message sent. Response:',tenant, bulkResponse);

      const campaignResult = await sendbulkmsg.updateCampaignRecord(tenant);
      // console.log('Campaign update result:', tenant, campaignResult);
    }

  } catch (error) {
    console.error('Error running scheduled task:', error);
  }
});

cron.schedule("0 */20 * * *", async function () {
  console.log('Public Leads');
  try {

    const res = await Publicleads.getOpenLeads();

    res.map((data, idx) => {
      let subject = "Unlock the Power of WhatsApp Business for Your Business";
      Mailer.sendEmail(data.email, data, subject, 'public_lead');
    });

  } catch (error) {
    console.error('Error running scheduled task:', error);
  }
});
