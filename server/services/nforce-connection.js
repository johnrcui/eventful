var nforce      = require('nforce');
var connection  = nforce.createConnection({
  clientId      : process.env.SF_API_CLIENT,
  clientSecret  : process.env.SF_API_SECRET,
  redirectUri   : '',
  environment   : 'production',
  mode          : 'single' // optional, 'single' or 'multi' user mode, multi default
});

var Promise     = global.Promise;
var connected   = false;

function connect() {
  if (connected) {
    return Promise().resolve(connection);
  } else {
    return connection
    .authenticate({
      username    : process.env.SF_API_USER,
      password    : process.env.SF_API_PASS
    })
    .then(() => {
      return connection;
    });
  }
}

module.exports = {
  connection    : connection,
  connect       : connect
};
