'use strict';

var archive = require('../lib');
var assert = require('assert');
var nock = require('nock');
var parseTimemap = require('../lib/timemap');
var promise = require('../lib/promise');

suite('archive.is', function () {
  suite('internal', function () {
    test('parseTimemap', function () {
      var parsed = parseTimemap(TIMEMAP1);

      assert.strictEqual(parsed.original, 'https://www.kernel.org/');
      assert.strictEqual(parsed.timegate, 'https://archive.is/timegate/https://www.kernel.org/');

      assertMemento(parsed.first, {
        url: 'https://archive.is/19980130085039/http://www.kernel.org/',
        date: 'Fri, 30 Jan 1998 08:50:39 GMT'
      });
      assertMemento(parsed.last, {
        url: 'https://archive.is/20160109153444/https://www.kernel.org/',
        date: 'Sat, 09 Jan 2016 15:34:44 GMT'
      });

      assert.strictEqual(parsed.mementos.length, 5);

      assertMemento(parsed.mementos[0], {
        url: 'https://archive.is/19980130085039/http://www.kernel.org/',
        date: 'Fri, 30 Jan 1998 08:50:39 GMT'
      });
      assertMemento(parsed.mementos[1], {
        url: 'https://archive.is/19990429093120/http://www.kernel.org/',
        date: 'Thu, 29 Apr 1999 09:31:20 GMT'
      });
      assertMemento(parsed.mementos[2], {
        url: 'https://archive.is/20001109014500/http://www.kernel.org/',
        date: 'Thu, 09 Nov 2000 01:45:00 GMT'
      });
      assertMemento(parsed.mementos[3], {
        url: 'https://archive.is/20151106022345/https://www.kernel.org/',
        date: 'Fri, 06 Nov 2015 02:23:45 GMT'
      });
      assertMemento(parsed.mementos[4], {
        url: 'https://archive.is/20160109153444/https://www.kernel.org/',
        date: 'Sat, 09 Jan 2016 15:34:44 GMT'
      });
    });

    suite('promise', function () {
      test('resolved callback', function (done) {
        promise(function (resolve) {
          resolve(42);
        }, function (error, number) {
          assert.ifError(error);
          assert.strictEqual(number, 42);
          done();
        });
      });

      test('rejected callback', function (done) {
        promise(function (resolve, reject) {
          reject(new Error('Some error'));
        }, function (error) {
          assert.strictEqual(error.message, 'Some error');
          done();
        });
      });

      test('resolved promise', function () {
        return promise(function (resolve) {
          resolve(42);
        }).then(function (number) {
          assert.strictEqual(number, 42);
        });
      });

      test('rejected promise', function () {
        return promise(function (resolve, reject) {
          reject(new Error('Some error'));
        }).then(didntReject, function (error) {
          assert.strictEqual(error.message, 'Some error');
        });
      });
    });
  });

  suite('timemap', function () {
    test('error', function () {
      nock('https://archive.is')
        .get('/timemap/https://nonexistent')
        .reply(404, 'TimeMap does not exists. The archive has no Mementos for the requested URI');

      return archive.timemap('https://nonexistent').then(didntReject, function (error) {
        assert.strictEqual(error.status, 404);
      });
    });

    test('successful', function () {
      nock('https://archive.is')
        .get('/timemap/https://www.kernel.org')
        .reply(200, TIMEMAP2);

      return archive.timemap('https://www.kernel.org').then(function (timemap) {
        assert.strictEqual(timemap.original, 'https://www.kernel.org/');
        assert.strictEqual(timemap.timegate, 'https://archive.is/timegate/https://www.kernel.org/');

        assertMemento(timemap.first, {
          url: 'https://archive.is/19980130085039/http://www.kernel.org/',
          date: 'Fri, 30 Jan 1998 08:50:39 GMT'
        });
        assertMemento(timemap.last, {
          url: 'https://archive.is/20160109153444/https://www.kernel.org/',
          date: 'Sat, 09 Jan 2016 15:34:44 GMT'
        });

        assert.strictEqual(timemap.mementos.length, 36);
      });
    });
  });

  suite('save', function () {
    test('error', function () {
      nock('https://archive.is')
        .post('/submit/', strict({
          url: 'https://www.kernel.org'
        }))
        .reply(500);

      return archive.save('https://www.kernel.org').then(didntReject, function (error) {
        assert.strictEqual(error.status, 500);
      });
    });

    test('no refresh header', function () {
      nock('https://archive.is')
        .post('/submit/', strict({
          url: 'https://nonexistent'
        }))
        .reply(200, '');

      return archive.save('https://nonexistent').then(didntReject, function (error) {
        assert.strictEqual(error.message, 'Couldn\'t save page: https://nonexistent');
      });
    });

    test('snapshot already exists', function () {
      nock('https://archive.is')
        .post('/submit/', strict({
          url: 'https://www.kernel.org'
        }))
        .reply(307, '', {
          'Location': 'https://archive.is/EJoGi'
        });

      return archive.save('https://www.kernel.org').then(function (result) {
        assert.deepStrictEqual(result, {
          id: 'EJoGi',
          shortUrl: 'https://archive.is/EJoGi',
          alreadyExists: true
        });
      });
    });

    test('new snapshot', function () {
      nock('https://archive.is')
        .post('/submit/', strict({
          url: 'https://www.kernel.org'
        }))
        .reply(200, '', {
          'Refresh': '0;url=https://archive.is/EJoGi'
        });

      return archive.save('https://www.kernel.org').then(function (result) {
        assert.deepStrictEqual(result, {
          id: 'EJoGi',
          shortUrl: 'https://archive.is/EJoGi',
          alreadyExists: false
        });
      });
    });

    test('anyway option', function () {
      nock('https://archive.is')
        .post('/submit/', strict({
          url: 'https://www.kernel.org',
          anyway: '1'
        }))
        .reply(200, '', {
          'Refresh': '0;url=https://archive.is/EJoGi'
        });

      return archive.save('https://www.kernel.org', { anyway: true }).then(function (result) {
        assert.deepStrictEqual(result, {
          id: 'EJoGi',
          shortUrl: 'https://archive.is/EJoGi',
          alreadyExists: false
        });
      });
    });
  });
});

function assertMemento (object, expected) {
  assert.strictEqual(object.url, expected.url);
  assert.strictEqual(object.date.getTime(), new Date(expected.date).getTime());
}

var TIMEMAP1 = [
  '<https://www.kernel.org/>; rel="original",',
  '<https://archive.is/timegate/https://www.kernel.org/>; rel="timegate",',
  '<https://archive.is/19980130085039/http://www.kernel.org/>; rel="first memento"; datetime="Fri, 30 Jan 1998 08:50:39 GMT",',
  '<https://archive.is/19990429093120/http://www.kernel.org/>; rel="memento"; datetime="Thu, 29 Apr 1999 09:31:20 GMT",',
  '<https://archive.is/20001109014500/http://www.kernel.org/>; rel="memento"; datetime="Thu, 09 Nov 2000 01:45:00 GMT",',
  '<https://archive.is/20151106022345/https://www.kernel.org/>; rel="memento"; datetime="Fri, 06 Nov 2015 02:23:45 GMT",',
  '<https://archive.is/20160109153444/https://www.kernel.org/>; rel="last memento"; datetime="Sat, 09 Jan 2016 15:34:44 GMT",',
  '<https://archive.is/timemap/https://www.kernel.org/>; rel="self"; type="application/link-format"; from="Fri, 30 Jan 1998 08:50:39 GMT"; until="Sat, 09 Jan 2016 15:34:44 GMT"'
].join('\n');

var TIMEMAP2 = [
  '<https://www.kernel.org/>; rel="original",',
  '<https://archive.is/timegate/https://www.kernel.org/>; rel="timegate",',
  '<https://archive.is/19980130085039/http://www.kernel.org/>; rel="first memento"; datetime="Fri, 30 Jan 1998 08:50:39 GMT",',
  '<https://archive.is/19990429093120/http://www.kernel.org/>; rel="memento"; datetime="Thu, 29 Apr 1999 09:31:20 GMT",',
  '<https://archive.is/20001109014500/http://www.kernel.org/>; rel="memento"; datetime="Thu, 09 Nov 2000 01:45:00 GMT",',
  '<https://archive.is/20120913234307/http://www.kernel.org/>; rel="memento"; datetime="Thu, 13 Sep 2012 23:43:07 GMT",',
  '<https://archive.is/20121209041018/https://www.kernel.org/>; rel="memento"; datetime="Sun, 09 Dec 2012 04:10:18 GMT",',
  '<https://archive.is/20130302091009/https://www.kernel.org/>; rel="memento"; datetime="Sat, 02 Mar 2013 09:10:09 GMT",',
  '<https://archive.is/20130807213109/https://www.kernel.org/>; rel="memento"; datetime="Wed, 07 Aug 2013 21:31:09 GMT",',
  '<https://archive.is/20130807213733/https://www.kernel.org/>; rel="memento"; datetime="Wed, 07 Aug 2013 21:37:33 GMT",',
  '<https://archive.is/20130807215844/https://www.kernel.org/>; rel="memento"; datetime="Wed, 07 Aug 2013 21:58:44 GMT",',
  '<https://archive.is/20130807220908/https://www.kernel.org/>; rel="memento"; datetime="Wed, 07 Aug 2013 22:09:08 GMT",',
  '<https://archive.is/20130914143858/https://www.kernel.org/>; rel="memento"; datetime="Sat, 14 Sep 2013 14:38:58 GMT",',
  '<https://archive.is/20131107035735/https://www.kernel.org/>; rel="memento"; datetime="Thu, 07 Nov 2013 03:57:35 GMT",',
  '<https://archive.is/20140120095300/https://www.kernel.org/>; rel="memento"; datetime="Mon, 20 Jan 2014 09:53:00 GMT",',
  '<https://archive.is/20140121190957/https://www.kernel.org/>; rel="memento"; datetime="Tue, 21 Jan 2014 19:09:57 GMT",',
  '<https://archive.is/20140124211312/https://www.kernel.org/>; rel="memento"; datetime="Fri, 24 Jan 2014 21:13:12 GMT",',
  '<https://archive.is/20140204071335/https://www.kernel.org/>; rel="memento"; datetime="Tue, 04 Feb 2014 07:13:35 GMT",',
  '<https://archive.is/20140226225228/https://www.kernel.org/>; rel="memento"; datetime="Wed, 26 Feb 2014 22:52:28 GMT",',
  '<https://archive.is/20140412220244/https://www.kernel.org/>; rel="memento"; datetime="Sat, 12 Apr 2014 22:02:44 GMT",',
  '<https://archive.is/20140601131731/https://www.kernel.org/>; rel="memento"; datetime="Sun, 01 Jun 2014 13:17:31 GMT",',
  '<https://archive.is/20140710153648/https://www.kernel.org/>; rel="memento"; datetime="Thu, 10 Jul 2014 15:36:48 GMT",',
  '<https://archive.is/20140716033054/https://www.kernel.org/>; rel="memento"; datetime="Wed, 16 Jul 2014 03:30:54 GMT",',
  '<https://archive.is/20140728175550/https://www.kernel.org/>; rel="memento"; datetime="Mon, 28 Jul 2014 17:55:50 GMT",',
  '<https://archive.is/20141008034800/https://www.kernel.org/>; rel="memento"; datetime="Wed, 08 Oct 2014 03:48:00 GMT",',
  '<https://archive.is/20150417141837/https://www.kernel.org/>; rel="memento"; datetime="Fri, 17 Apr 2015 14:18:37 GMT",',
  '<https://archive.is/20150715032634/https://www.kernel.org/>; rel="memento"; datetime="Wed, 15 Jul 2015 03:26:34 GMT",',
  '<https://archive.is/20150721020519/https://www.kernel.org/>; rel="memento"; datetime="Tue, 21 Jul 2015 02:05:19 GMT",',
  '<https://archive.is/20150721123554/https://www.kernel.org/>; rel="memento"; datetime="Tue, 21 Jul 2015 12:35:54 GMT",',
  '<https://archive.is/20150722152857/https://www.kernel.org/>; rel="memento"; datetime="Wed, 22 Jul 2015 15:28:57 GMT",',
  '<https://archive.is/20150723105007/https://www.kernel.org/>; rel="memento"; datetime="Thu, 23 Jul 2015 10:50:07 GMT",',
  '<https://archive.is/20150725031706/https://www.kernel.org/>; rel="memento"; datetime="Sat, 25 Jul 2015 03:17:06 GMT",',
  '<https://archive.is/20150726031719/https://www.kernel.org/>; rel="memento"; datetime="Sun, 26 Jul 2015 03:17:19 GMT",',
  '<https://archive.is/20150727072556/https://www.kernel.org/>; rel="memento"; datetime="Mon, 27 Jul 2015 07:25:56 GMT",',
  '<https://archive.is/20150903034811/https://www.kernel.org/>; rel="memento"; datetime="Thu, 03 Sep 2015 03:48:11 GMT",',
  '<https://archive.is/20151101192510/https://www.kernel.org/>; rel="memento"; datetime="Sun, 01 Nov 2015 19:25:10 GMT",',
  '<https://archive.is/20151106022345/https://www.kernel.org/>; rel="memento"; datetime="Fri, 06 Nov 2015 02:23:45 GMT",',
  '<https://archive.is/20160109153444/https://www.kernel.org/>; rel="last memento"; datetime="Sat, 09 Jan 2016 15:34:44 GMT",',
  '<https://archive.is/timemap/https://www.kernel.org/>; rel="self"; type="application/link-format"; from="Fri, 30 Jan 1998 08:50:39 GMT"; until="Sat, 09 Jan 2016 15:34:44 GMT"'
].join('\n');

function didntReject () {
  throw new Error('Didn\'t reject');
}

function strict (expected) {
  return function (body) {
    try {
      assert.deepStrictEqual(body, expected);
      return true;
    } catch (error) {
      return false;
    }
  }
}
