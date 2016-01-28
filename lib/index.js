'use strict';

var assert = require('assert');
// noinspection JSUnresolvedFunction
var assign = require('object.assign').getPolyfill();
var createError = require('http-errors');
var parseTimemap = require('./timemap');
var promise = require('./promise');
var request = require('request');

/**
 * @typedef {Object} Memento
 * @property url {string} Snapshot access URL
 * @property date {Date} Snapshot taking date
 */

/**
 * @typedef {Object} MementoList
 * @property original {string} Original page URL
 * @property timegate {string} Timegate URL
 * @property first {Memento} The oldest snapshot
 * @property last {Memento} The newest snapshot
 * @property mementos {Array.<Memento>} All snapshots sorted by `date` in ascending order
 */

module.exports = {

  /**
   * Get a list of all snapshots of a given page.
   * @param url {string} Page URL
   * @param [callback] {function} If omitted, a promise will be returned
   * @returns {?Promise<MementoList>}
   */
  timemap: function (url, callback) {
    assert.strictEqual(typeof url, 'string', 'URL should be a string');

    return promise(function (resolve, reject) {
      request('https://archive.is/timemap/' + url, function (error, response, body) {
        if (error)
          return reject(error);

        if (response.statusCode !== 200)
          return reject(createError(response.statusCode));

        var result;
        try {
          result = parseTimemap(body.toString());
        } catch (e) {
          return reject(e);
        }
        resolve(result);
      });
    }, callback);
  },

  /**
   * Take a new snapshot of a page.
   * @param url {string} Page URL
   * @param [options] {Object}
   * @param [options.anyway = false] {boolean} Force snapshot taking, even if it already exists
   * @param [callback] {function} If omitted, a promise will be returned
   * @returns {?Promise<{ id: {string}, shortUrl: {string}, alreadyExists: {boolean} }>}
   */
  save: function (url, options, callback) {
    assert.strictEqual(typeof url, 'string', 'URL should be a string');
    callback = typeof options === 'function' ? options : callback;
    options = typeof options === 'object' ? options : {};

    var form = {
      url: url
    };
    if (options.anyway)
      form.anyway = '1';

    return promise(function (resolve, reject) {
      request.post('https://archive.is/submit/', {
        form: form,
        headers: {
          'Referer': 'https://archive.is',
          'User-Agent': USER_AGENT
        }
      }, function (error, response) {
        if (error)
          return reject(error);

        if (response.statusCode === 200) {
          // noinspection JSUnresolvedVariable
          var match = (response.headers.refresh || '').match(/^0;url=(.+)$/);
          if (!match)
            return reject(new Error('Couldn\'t save page: ' + url));
          try {
            return resolve(assign(parseUrl(match[1]), {
              alreadyExists: false
            }));
          } catch (e) {
            return reject(new Error('Incorrect \'Refresh\' header'));
          }
        }

        if (response.statusCode === 307 || response.statusCode === 302) {
          try {
            return resolve(assign(parseUrl(response.headers.location), {
              alreadyExists: true
            }));
          } catch (e) {
            return reject(new Error('Incorrect \'Location\' header'));
          }
        }

        reject(createError(response.statusCode));
      });
    }, callback);
  }
};

function parseUrl (url) {
  assert.strictEqual(typeof url, 'string');
  var match = url.match(/^https:\/\/archive.is\/(.+)$/);
  assert(match);
  return {
    id: match[1],
    shortUrl: url
  };
}

var USER_AGENT = 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36';
