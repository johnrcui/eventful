'use strict';

var nforce = require('nforce');
var express = require('express');
var app = express();

var org = nforce.createConnection({
  clientId      : process.env.SF_API_CLIENT,
  clientSecret  : process.env.SF_API_SECRET,
  redirectUri   : '',
  environment   : 'production',
  mode          : 'single' // optional, 'single' or 'multi' user mode, multi default
});

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/client'));

app.get('/connect', function(request, respose) {
  org.authenticate({
    username      : process.env.SF_API_USER,
    password      : process.env.SF_API_PASS
  })
  .then(function (resource) {
    respose.json(resource);
  })
  .catch(function (resource) {
    respose.json(resource);
  });
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
