# archive.is

Unofficial Node.js API for [archive.is][1]

[![Build Status](https://travis-ci.org/qvint/archive.is.svg?branch=master)](https://travis-ci.org/qvint/archive.is)
[![Dependency Status](https://david-dm.org/qvint/archive.is.svg)](https://david-dm.org/qvint/archive.is)
[![devDependency Status](https://david-dm.org/qvint/archive.is/dev-status.svg)](https://david-dm.org/qvint/archive.is#info=devDependencies)

## Install

```bash
npm install archive.is --save
```

## Usage

```js
var archive = require('archive.is');

// Get the last existing snapshot of https://www.kernel.org
archive.timemap('https://www.kernel.org').then(function (timemap) {
  console.log(timemap.last);
  // { url: 'https://archive.is/20160109153444/https://www.kernel.org/',
  //   date: Sat, 09 Jan 2016 15:34:44 GMT }
});

// Take a new snapshot of https://www.kernel.org
archive.save('https://www.kernel.org').then(function (result) {
  console.log(result.shortUrl); // https://archive.is/EJoGi
});
```

## API

### `timemap(url, [callback])`

Get a list of all snapshots of a given page.

* **`url`** `{string}` Page URL
* **`callback`** `{function}` If omitted, a promise will be returned

Returned promise will be fulfilled with an object with the following keys:

* **`original`** `{string}` Original page URL
* **`timegate`** `{string}` Timegate URL
* **`first`** <code>{[Memento][3]}</code> The oldest snapshot
* **`last`** <code>{[Memento][3]}</code> The newest snapshot
* **`mementos`** <code>{Array.<[Memento][3]>}</code> All snapshots sorted by `date` in ascending order

Example result:

```
{ original: 'https://www.kernel.org/',
  timegate: 'https://archive.is/timegate/https://www.kernel.org/',
  first:
   { url: 'https://archive.is/19980130085039/http://www.kernel.org/',
     date: Fri, 30 Jan 1998 08:50:39 GMT },
  last:
   { url: 'https://archive.is/20160127210011/https://www.kernel.org/',
     date: Wed, 27 Jan 2016 21:00:11 GMT } }
  mementos:
   [ { url: 'https://archive.is/19980130085039/http://www.kernel.org/',
       date: Fri, 30 Jan 1998 08:50:39 GMT },
     { url: 'https://archive.is/19990429093120/http://www.kernel.org/',
       date:Thu, 29 Apr 1999 09:31:20 GMT },
     ...
     { url: 'https://archive.is/20160127180405/https://www.kernel.org/',
       date: Wed, 27 Jan 2016 18:04:05 GMT },
     { url: 'https://archive.is/20160127210011/https://www.kernel.org/',
       date: Wed, 27 Jan 2016 21:00:11 GMT } ]
```

### `save(url, [options], [callback])`

Take a new snapshot of a page.

* **`url`** `{string}` Page URL
* **`options`** `{Object}`
* **`options.anyway`** `{boolean}` Force snapshot taking, even if it already exists `[false]`
* **`callback`** `{function}` If omitted, a promise will be returned

Returned promise will be fulfilled with an object with the following keys:

* **`id`** `{string}` Snapshot ID
* **`shortUrl`** `{string}` Short URL (https://archive.is/ + id)
* **`alreadyExists`** `{boolean}` Shows if the returned snapshot was newly created (false) or not (true)

Note that `anyway` option cannot be used more than once in ~3–5 minutes for the same URL. So it is possible to get already existing snapshot, even after setting `anyway` to true.

Example result:

```
{ id: 'nUdVJ',
  shortUrl: 'https://archive.is/nUdVJ',
  alreadyExists: true }
```

<a name="memento"></a>
### `Memento` object

* **`url`** `{string}` Snapshot access URL
* **`date`** `{Date}` Snapshot taking date

## License

The `archive.is` package is released under the GPL-3.0 license. See the [LICENSE][2] for more information.

[1]: https://archive.is
[2]: https://github.com/qvint/archive.is/blob/master/LICENSE
[3]: #memento
