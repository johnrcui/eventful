var _           = require('underscore');
var nforce      = require('nforce');
var $connector  = require('./../services/nforce-connection');
var marshall    = require('./../libraries/marshall');

var Promise     = global.Promise;

var SOBJECT_EVENT   = 'Event__c';
var SOBJECT_SESSION = 'Session__c';

/////////////////////
//  P R I V A T E  //
/////////////////////

/**
 * Transform an event object into a standard format
 * API output
 *
 * @apram  {object}   event
 * @return {Promise}
 */
var transformEvent = (event) => {
  return {
    resourceId        : event.get('id'),
    eventId           : event.get('name'),
    name              : event.get('name__c'),
    description       : event.get('description__C'),
    startDate         : event.get('start_date__c'),
    endDate           : event.get('end_date__c'),
    status            : event.get('status__c'),
    availableSeats    : event.get('available_seats__c'),
    registeredCount   : event.get('registered_count__c'),
    registrationLimit : event.get('registration_limit__c')
  };
}

/**
 * Transform an event session object into a standard
 * format API output
 */
var transformEventSession = (eventSession) => {
  var sessionMembers = eventSession.get('members__r');
  var members = sessionMembers && _.map(sessionMembers.records, (attendee) => {
    return {
      resourceId: attendee['Attendee__c']
    };
  }) || [];

  return {
    resourceId        : eventSession.get('id'),
    sessionId         : eventSession.get('name'),
    name              : eventSession.get('name__c'),
    startDate         : eventSession.get('start_date__c'),
    endDate           : eventSession.get('end_date__c'),
    status            : eventSession.get('status__c'),
    availableSeats    : eventSession.get('available_seats__c'),
    registrationCount : eventSession.get('registration_count__c'),
    registrationLimit : eventSession.get('registration_limit__c'),
    attendees         : members
  };
}

/**
 * Request a list of event records
 *
 * @return {Promise}
 */
var listEvents = (withDrafts) => {
  var query = `SELECT Id, Name, Name__c, Description__c, Start_Date__c, End_Date__c, Status__c, Available_Seats__c, Registered_Count__c, Registration_Limit__c FROM ${SOBJECT_EVENT}`;

  if (!withDrafts) {
    query += ` WHERE Status__c <> 'Draft'`;
  }

  return $connector
  .connect()
  .then((connection) => {
    return connection
    .query({ query: query });
  })
  .then((resource) => {
    return {
      data: _.map(resource.records, (record) => {
        return transformEvent(record);
      }),
      meta: {
        total: resource.totalSize
      }
    };
  });
};

/**
 * Request a list of event session records from
 * a given event
 *
 * @param  {string}   eventId
 * @return {Promise}
 */
var listEventSessions = (eventId, withDrafts) => {
  var query = `SELECT Id, Name, Name__c, Status__c, Start_Date__c, End_Date__c, Registration_Limit__c, Registration_Count__c, Available_Seats__c, (SELECT Id, Session__c, Attendee__c FROM Members__r) FROM ${SOBJECT_SESSION} WHERE Event__r.Id = '${eventId}'`;

  if (!withDrafts) {
    query += ` AND Status__c <> 'Draft'`;
  }

  return $connector
  .connect()
  .then((connection) => {
    return connection
    .query({ query: query});
  });
};

/**
 * Request an event record with it's sessions
 *
 * @param  {string}   eventId
 * @return {Promise}
 */
var fetchEvent = (eventId, withDrafts) => {
  console.log(`Fetching Event: ${eventId}`);
  return $connector
  .connect()
  .then((connection) => {
    return Promise.all([
      connection
      .getRecord({
        type: 'Event__c',
        id: eventId
      }),
      listEventSessions(eventId, withDrafts)
    ]);
  })
  .then((resolves) => {
    var event = transformEvent(resolves[0]);
    event['sessions'] = _.map(resolves[1].records, (session) => {
      return transformEventSession(session);
    });

    return {
      data: event,
      meta: {}
    };
  });
}

/////////////////////////
//  P U B L I S H E D  //
/////////////////////////

module.exports = {
  // ** List Events ** //
  list  : (request, response) => {
    var withDrafts = request.query.withDrafts === 'true';

    listEvents(withDrafts)
    .then((resource) => {
      response.json(resource);
    });
  },

  // ** Fetch Event ** //
  fetch : (request, response) => {
    var withDrafts = request.query.withDrafts === 'true';

    fetchEvent(request.params.id, withDrafts)
    .then((record) => {
      response.json(record);
    })
//    .catch((err) => {
//      response
//      .status(err.statusCode)
//      .json({
//        errors: err.body
//      });
//    })
//    .catch((err) => {
//      console.log(err);
//    });
  },

  // ** Store Event ** //
  store : (request, response) => {

  },

  // ** Patch Event ** //
  patch : (request, response) => {

  },

  // ** Tras Event ** //
  trash : (request, response) => {

  }
}
