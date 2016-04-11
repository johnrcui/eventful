var _           = require('underscore');
var nforce      = require('nforce');
var $connector  = require('./../services/nforce-connection');
var marshall    = require('./../libraries/marshall');

var SOBJECT_ATTENDEE      = 'Attendee__c';
var SOBJECT_SESSION       = 'Session__c';
var SOBJECT_SESS_MEMBER   = 'Session_Member__c';

var Promise     = global.Promise;

/////////////////////
//  P R I V A T E  //
/////////////////////

/**
 * Transform an attendee object into a standard format
 * API output
 *
 * @param  {object}   attendee
 * @return {object}
 */
var transformAttendee = (attendee) => {
  return {
    resourceId  : attendee.get('id'),
    attendeeId  : attendee.get('name'),
    firstName   : attendee.get('first_name__c'),
    lastName    : attendee.get('last_name__c'),
    email       : attendee.get('email__c'),
    phone       : attendee.get('phone__c'),
    company     : attendee.get('company__c')
  };
};

/**
 * Request a list of attendee records
 *
 * @return {Promise}
 */
var listAttendees = () => {
  var query = `SELECT Id, Name, First_Name__c, Last_Name__c, Email__c, Phone__c, Company__c FROM ${SOBJECT_ATTENDEE}`;

  return $connector
  .connect()
  .then((connection) => {
    return connection
    .query({ query: query });
  })
  .then((resource) => {
    return {
      data: _.map(resource.records, (record) => {
        return transformAttendee(record);
      }),
      meta: {
        total: resource.totalSize
      }
    };
  });
};

/**
 * Request an attendee record
 *
 * @param  {string}   id
 * @return {Promise}
 */
var fetchAttendee = (id) => {
  return $connector
  .connect()
  .then((connection) => {
    return connection
    .getRecord({
      type: SOBJECT_ATTENDEE,
      id: id
    });
  })
  .then((resource) => {
    return {
      data: transformAttendee(resource),
      meta: {}
    };
  });
};

/**
 * Store an attendee record
 *
 * @param  {object}   record
 * @return {Promise}
 */
var storeAttendee = (record) => {
  var attendee = nforce.createSObject(SOBJECT_ATTENDEE, record);

  return $connector
  .connect()
  .then((connection) => {
    return connection
    .insert({
      sobject: attendee
    });
  })
  .then((resource) => {
    return {
      data: transformAttendee(resource),
      meta: {}
    };
  });
};

/**
 * Update an attendee record
 *
 * @param  {string}   id
 * @param  {object}   record
 * @return {Promise}
 */
var patchAttendee = (id, record) => {
  return $connector
  .connect()
  .then((connection) => {
    return connection
    .getRecord({
      type: SOBJECT_ATTENDEE,
      id: id
    });
  })
  .then((attendee) => {
    // Update sobject instance
    attendee.set(record);

    // Save changes
    return $connector
    .connection
    .update({
      sobject: attendee
    })
    .then(() => {
      return attendee;
    });
  })
  .then((resource) => {
    return {
      data: transformAttendee(resource),
      meta: {}
    };
  });
}

/**
 * Trash an attendee record
 *
 * @param  {string}   id
 * @return {Promise}
 */
var trashAttendee = (id) => {

}

/**
 *
 */
var attendSession = (attendeeId, sessionId) => {
  return $connector
  .connect()
  .then((connection) => {
    var query = `SELECT COUNT() FROM Session_Member__c WHERE Session__c = '${sessionId}' AND Attendee__c = '${attendeeId}'`;
    var promises = [
      connection
      .getRecord({
        type: SOBJECT_ATTENDEE,
        id: attendeeId
      }),
      connection
      .getRecord({
        type: SOBJECT_SESSION,
        id: sessionId
      }),
      connection
      .query({ query: query, raw: true })
    ]

    return Promise.all(promises);
  })
  .catch(() => {
    throw new Error('Could not resolve required references.');
  })
  .then((resolves) => {
    var attendee = resolves.shift();
    var eventSession = resolves.shift();
    var countQuery = resolves.shift();
    var member;

    if (countQuery.totalSize > 0) {
      throw new Error('Already signed up for this session.');
    }

    if (eventSession.get('available_seats__c') === 0
    ||  eventSession.get('status__c').toLowerCase() === 'closed'
    ){
      throw new Error('Session is full or closed.');
    }

    member = nforce.createSObject(SOBJECT_SESS_MEMBER, {
      'attendee__c'   : attendeeId,
      'session__c'    : sessionId
    });

    return $connector
    .connection
    .insert({
      sobject: member
    });
  });
}

/**
 *
 */
var cancelSession = (attendeeId, sessionId) => {

}

/////////////////////////
//  P U B L I S H E D  //
/////////////////////////

module.exports = {
  // ** List Attendees ** //
  list  : (request, response) => {
    listAttendees()
    .then((records) => {
      response.json(records);
    });
  },

  // ** Fetch Attendee ** //
  fetch : (request, response) => {
    fetchAttendee(request.params.id)
    .then((record) => {
      response.json(record);
    })
    .catch((err) => {
      response
      .status(err.statusCode)
      .json({
        errors: err.body
      });
    });
  },

  // ** Store Attendee ** //
  store : (request, response) => {
    // marshall input
    marshall(request.body, {
      firstName   : 'required',
      lastName    : 'required',
      email       : 'required|email',
      phone       : 'optional',
      company     : 'optional'
    })
    // transform passing values
    .reform({
      firstName   : 'First_Name__c',
      lastName    : 'Last_Name__c',
      email       : 'Email__c',
      phone       : 'Phone__c',
      company     : 'Company__c'
    })
    // treat as a promise to elegantly handle errors
    .promise()
    .catch((err) => {
      response
      .status(422)
      .json({
        errors: err.messages
      });
    })
    // store information when all validation passes
    .then(storeAttendee)
    .then((resource) => {
      response
      .status(201)
      .json(resource);
    })
    .catch((err) => {
      response
      .status(422)
      .json({
        errors: err.body
      });
    });
  },

  // ** Patch Attendee ** //
  patch : (request, response) => {
    // marshall input
    marshall(request.body, {
      firstName   : 'required',
      lastName    : 'required',
      email       : 'required|email',
      phone       : 'optional',
      company     : 'optional'
    })
    // transform passing values
    .reform({
      firstName   : 'First_Name__c',
      lastName    : 'Last_Name__c',
      email       : 'Email__c',
      phone       : 'Phone__c',
      company     : 'Company__c'
    })
    // treat as a promise to elegantly handle errors
    .promise()
    .catch((err) => {
      response
      .status(422)
      .json({
        errors: err.messages
      });
    })
    // update information when all validation passes
    .then((reformed) => {
      return patchAttendee(request.params.id, reformed);
    })
    .then((resource) => {
      response.json(resource);
    })
    .catch((err) => {
      response
      .status(422)
      .json({
        errors: err.body
      });
    });
  },

  // ** Trash Attendee ** //
  trash : (request, response) => {

  },

  // ** Attend Session ** //
  attend : (request, response) => {
    var attendeeId = request.params.id;

    // marshall input
    marshall(request.body, {
      sessionResourceId : 'required'
    })
    .promise()
    .catch((err) => {
      response
      .status(422)
      .json({
        errors: err.messages
      });
    })
    .then((marshalled) => {
      return attendSession(attendeeId, marshalled.sessionResourceId);
    })
    .then(() => {
      response
      .status(201)
      .end();
    })
    .catch((err) => {
      response
      .status(400)
      .json({
        errors: err.messages || err.message
      });
    });
  },

  // ** Cancel Attendance ** //
  cancel : (request, response) => {

  }

}
