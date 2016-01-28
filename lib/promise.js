'use strict';

var Promise = require('pinkie-promise');

/**
 * @private
 * @param executor {function}
 * @param [callback] {function}
 * @returns {?Promise}
 */
module.exports = function (executor, callback) {
  var resolve, reject, result;

  if (typeof callback === 'function') {
    resolve = callback.bind(null, null);
    reject = callback;
  } else {
    result = new Promise(function (_resolve, _reject) {
      resolve = _resolve;
      reject = _reject;
    });
  }

  executor(resolve, reject);

  return result;
};
