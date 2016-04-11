'use strict';

var _           = require('underscore');
var path        = require('path');
var bodyParser  = require('body-parser');
var ctlAttendees = require('./controllers/attendees');
var ctlEvents   = require('./controllers/events');

module.exports = (router) => {

  var jsonParser = bodyParser.json();

  router
  // ** Attendees ** //
  .get    ('/attendees'       , ctlAttendees.list)
  .get    ('/attendees/:id'   , ctlAttendees.fetch)
  .post   ('/attendees'       , jsonParser      , ctlAttendees.store)
  .put    ('/attendees/:id'   , jsonParser      , ctlAttendees.patch)
  .post   ('/attendees/:id/attend', jsonParser  , ctlAttendees.attend)
  // ** Events ** //
  .get    ('/events'          , ctlEvents.list)
  .get    ('/events/:id'      , ctlEvents.fetch)
  ;
}
