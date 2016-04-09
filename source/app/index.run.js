(function() {
  'use strict';

  angular
    .module('eventful')
    .run(runBlock);

  /** @ngInject */
  function runBlock($log) {

    $log.debug('runBlock end');
  }

})();
