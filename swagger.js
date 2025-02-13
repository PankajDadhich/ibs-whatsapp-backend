const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'Spark API',
    description: 'The API collection for spark.indicrm.io backend',
  },
  host: 'spark.indicrm.io/ibs',
  schemes: ['https'],
};

const outputFile = 'D:/NODE_WORKSPACE/Spark/swagger-output.json';
const endpointsFiles = ['./app/routes/auth.routes.js', './app/routes/lead.routes.js'];

/* NOTE: if you use the express Router, you must pass in the 
   'endpointsFiles' only the root file where the route starts,
   such as index.js, app.js, routes.js, ... */

swaggerAutogen(outputFile, endpointsFiles, doc);