'use strict';

var express       = require('express');
var compression   = require('compression');

var app           = express();
var apiRouter     = express.Router();

/**
 * Initialize Services
 */
function initializeServices() {
  console.info('Initializing Application Services...');

  var routes = require(__dirname + '/server/routes');

  routes(apiRouter);
}

/**
 * Inject Application Middleware
 */
function injectMiddleware() {
  console.info('Ijecting Application Middleware...');

  app
  .use(compression())
  .use('/api', apiRouter)
  .use(express.static(__dirname + '/client'));

}

/**
 * Start the Application Server
 */
function startServer() {
  var port = process.env.PORT || 5000;

  console.info('Starting Application Server...');
  app
  .set('port', port)
  .listen(port, function() {
    console.info(`-- Listening on port: ${port}`);
  });
}

/**
 * Bootstrap the Application
 */
function bootstrap() {
  console.info('Bootstrapping Application...')
  try {
    initializeServices();
    injectMiddleware();
    startServer();
    console.info('Application is Ready!');
  } catch (e) {
    console.error('Bootstrap process failed!', e.message);
  }
}

bootstrap();
