'use strict';

var parse = require('h5.linkformat').parse;

/**
 * @private
 * @param input {string}
 * @returns {MementoList}
 */
module.exports = function (input) {
  var parsed = parse(input);
  var result = {
    mementos: []
  };

  var i, l, rel, link;
  for (i = 0, l = parsed.length; i < l; i++) {
    link = parsed[i];
    if (!has(link, 'rel'))
      continue;
    rel = parsed[i].rel.trim().split(/\s/);

    if (includes(rel, 'original'))
      result.original = link.href;

    if (includes(rel, 'timegate'))
      result.timegate = link.href;

    if (has(link, 'datetime')) {
      if (includes(rel, 'memento'))
        result.mementos.push(memento(link));

      if (includes(rel, 'first'))
        result.first = memento(link);

      if (includes(rel, 'last'))
        result.last = memento(link);
    }
  }

  return result;
};

function has (object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function includes (array, value) {
  return array.indexOf(value) !== -1;
}

/**
 * @param link {{ href: {string}, datetime: {string} }}
 * @returns {Memento}
 */
function memento (link) {
  return {
    url: link.href,
    date: new Date(link.datetime)
  };
}
