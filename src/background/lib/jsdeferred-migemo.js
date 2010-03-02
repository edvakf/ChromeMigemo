// JSDeferred-Migemo
// Version : 0.5.0
// License : The MIT License <http://www.opensource.org/licenses/mit-license.php>
//   Copyright (c) 2009 Atsushi TAKAYAMA (taka.atsushi (a) gmail.com)
// Depends on :
//   jsdeferred.js <http://github.com/cho45/jsdeferred>
//   jsdeferred-webdatabase <http://github.com/hotchpotch/jsdeferred-webdatabase>
// Thanks to :
//   The original Migemo in Ruby (GNU GPL) <http://0xcc.net/migemo/>
//   JavaScript/Migemo (no license specified) <http://oldriver.org/jsmigemo/>

// This library was got some ideas from the JS/Migemo, but
// most of the code was written from scratch by the author.

// Example usage:
//   var Migemo = Deferred.Migemo;
//   var config = Migemo.createConfigJa();
//   Migemo.initialize(config)
//   .next(function() {
//     return Migemo.getRegExpString('shinkansen');
//   })
//   .next(function(str) {
//     var regexp = new RegExp(str, 'g');
//     return someText.match(regexp);
//   })

(function() {
  if (!window.Deferred || !window.Deferred.WebDatabase) return;
  var Deferred = window.Deferred;

  // Deferred delegation utility
  if (!Deferred.prototype._) Deferred.prototype._ = function(obj) {
    var self = this;
    var klass = function() {};
    klass.prototype = obj;
    var delegate = new klass;
    for (var x in obj) if (typeof obj[x] === 'function') (function(x) {
      delegate[x] = function() {
        var args = Array.prototype.slice.call(arguments);
        return self.next(function() {
          return obj[x].apply(obj, args);
        });
      }
    })(x);
    return delegate;
  };

  /*
   * define Deferred.Migemo.*
   */
  var Migemo = Deferred.Migemo = {
    initialize : initialize,
    getCompletion : getCompletion,
    getRegExpString : getRegExpString,
    getRegExpStringFromWords : getRegExpStringFromWords,
    initialized : false,
  };

  function initialize(config) {
    if (!config) config = {};
    var forceCreateDatabase = !!config.forceCreateDatabase;
    var dictionaryPaths = config.dictionaryPaths || ['migemo-dict'];
    if (config.customDictionary) customDictionary = config.customDictionary;
    if (config.expandQuery) expandQuery = config.expandQuery;
    if (config.expandResult) expandResult = config.expandResult;

    // if database is already created
    if (!forceCreateDatabase) {
      return Deferred.wait(0);
    } else {
      return openDictionaryFiles( dictionaryPaths )
        .next(function(text) {
          return createDatabase(text);
        });
    }
  };

  /*
  *  Database interactions
  */
  var Database = Deferred.WebDatabase;
  var Model = Database.Model;
  var db = new Database('Migemo', {estimatedSize: 100*1024*1024});
  var Dictionary = Model({ 
    table :  'dictionary', 
    primaryKeys : ['id'],
    fields : {
      id         : 'INTEGER PRIMARY KEY',
      word       : 'TEXT COLLATE NOCASE',
      completion : 'TEXT NOT NULL'
    }
  }, db);

  function createDatabase(text) {
    return Dictionary.dropTable()
      ._(Dictionary).createTable()
      .next(function() {
        var lines = text.split(/\s*\n/);
        var i=0, line;
        var t = Date.now();
        return Deferred.loop(Math.ceil(lines.length/1000), function() {
          return Dictionary._db.transaction(function() {
            while (line = lines[i++]) {
              if (/^#/.test(line) || /^\s*$/.test(line)) continue;
              var s = line.split(/\s+/);
              var word = s.shift();
              var completions = s;
              completions.forEach(function(completion) {
                new Dictionary({word: word, completion: completion}).save();
              });
              if (i % 1000 == 0) {
                if (Migemo.debug) console.log(i + ' items stored. Time : ' + Math.floor((Date.now()-t)/100)/10 + ' s');
                break;
              }
            }
          });
        });
      })
      ._(Dictionary).execute(['DROP INDEX IF EXISTS word_i;'])
      ._(Dictionary).execute(['CREATE INDEX word_i ON dictionary (word);'])
  };

  // load dictionary file
  var customDictionary = ''; // may be overridden by the config
  function openDictionaryFiles(paths) {
    console.log(paths);
    return Deferred.parallel(
      paths.map(function(path) {return openDictionaryFile(path);})
    )
    .next(function(texts) {
      texts.push(customDictionary);
      return texts.join('\n');
    })
  };

  function openDictionaryFile(path) {
    var d = new Deferred;
    var xhr = new XMLHttpRequest;
    xhr.open('GET', path, true);
    xhr.onload = function() { d.call(xhr.responseText) };
    xhr.onerror = function() { d.fail('XHR failed.') };
    xhr.send();
    return d;
  };

  function lookupAmbiguous(words) {
    var t = Date.now();
    var where = '';
    var bind = [];
    var nextWord;
    words.sort().forEach(function(word, i) {
      var nextWord2 = word.slice(0,-1) + String.fromCharCode(word.charCodeAt(word.length - 1) + 1);
      if (i === 0) {
        where += '(word >= ? AND word < ?)';
        bind.push(word, nextWord2);
      } else if (word > nextWord) {
        where += ' OR (word >= ? AND word < ?)';
        bind.push(word, nextWord2);
      } else if (word === nextWord) {
        bind.pop();
        bind.push(nextWord2);
      } else {
        // word < nextWord (don't care)
      }
      nextWord = nextWord2;
    });
    console.log([where,bind])

    return Dictionary
    .find({
      fields: ['completion'],
      where: [where, bind]
    })
    .next(function(results) {
      if (Migemo.debug) console.log('Ambiguous search for ' + words + ' took ' + (Date.now() - t) + ' ms, found ' + results.length + ' results.');
      return results.map(function(res) {return res.completion});
    })
  }

  function lookupExact(words) {
    var t = Date.now();
    var where = '';
    var bind = [];
    words.forEach(function(word, i) {
      if (i !== 0) where += ' OR ';
      where += 'word = ?';
      bind.push(word);
    });

    return Dictionary
    .find({
      fields: ['completion'],
      where: [where, bind]
    })
    .next(function(results) {
      if (Migemo.debug) console.log('Exact search for ' + words + ' took ' + (Date.now() - t) + ' ms, found ' + results.length + ' results.');
      return results.map(function(res) {return res.completion});
    })
  }
  /*
   * Migemo.getCompletion(query) => pass completion list to next Deferred as 2D array of strings
   *   (completion list for each segment)
   */
  function getCompletion(query) {
    if (query === '') return Deferred.next(function() {return [];});

    // expanding query means something like
    // query : 'ata atta' => expanded : [["ata","あた"], ["atta","あった"]]
    var expanded = expandQuery(query);
    var last = expanded[expanded.length-1];
    
    return Deferred.parallel(
      expanded.map(function(group) {
        var lookup = (group !== last) ? lookupExact(group) : lookupAmbiguous(group);
        return lookup.next(function(results) {
          // group : ["atta","あった"] => results : [ ['attack', 'attach'], ['あった'] ]
          results = extractPrefix(results).concat(group);
          // what expandResult does is: 'attack' => ['attack', 'attacked', 'attacking', 'attacker']
          // or 'あった' => ['あった', 'アッタ']
          results = concat(results.map(expandResult));
          return extractPrefix(results);
        });
      })
    );
  };

  function concat(ary) {
    return Array.prototype.concat.apply([], ary);
  }

  // takes array of strings, if a string is at the beginning of 
  // another string, then remove the longer one
  function extractPrefix(ary) {
    var t = Date.now();
    var l = ary.length;
    var prefixes = [];
    var prefix_ary = {};
    for (var i = 0; i < l; i++) {
      var word = ary[i];
      var prefix = word[0];
      var a = prefix_ary[prefix];
      if (a) {
        var wl = word.length;
        var inserted = false;
        for (var j = 0; j < a.length; j++) {
          if (a[j].length <= wl) {
            if (word.indexOf(a[j]) === 0) break;
          } else if (inserted) {
            if (a[j].indexOf(word) === 0) a.splice(j, 1);
          } else { // not inserted yet
            a.splice(j - 1, 0, word);
            inserted = true;
            j++;
          }
        }
        if (!inserted) a.push[word];
      } else {
        prefix_ary[prefix] = [word];
        prefixes.push(prefix);
      }
    }
    ary = concat(prefixes.map(function(p) {return prefix_ary[p];}));
    if (Migemo.debug) console.log('extractPrefix : length ' + l + ' -> ' + ary.length + '. time ' + (Date.now() - t) + 'ms.');
    return ary;
  }

  // below functions are intended to be overridden by the locale
  function expandQuery(query) {return [[query]];};
  function expandResult(result) {return [result];};

  /*
   * Migemo.getRegExpString(words, longestMatch) 
   *   => returns a RegExp-compilable string
   * if longestMatch is true, the compiled RegExp will match the longest part
   */
  function getRegExpString(query, longestMatch) {
    if (query == '') return Deferred.next(function() {return '';});

    return Migemo.getCompletion(query)
      .next(function(lists) {
        var regexpSegments = lists.map(function(completions) {
          return Migemo.getRegExpStringFromWords(completions, longestMatch);
        });

        // query : "shougi" => return : "将棋|商議|娼妓|床几|象棋|省議|shougi|ｓｈｏｕｇｉ|しょうぎ|ショウギ|ｼｮｳｷﾞ"
        if (regexpSegments.length == 1) return regexpSegments[0];
        // query : "shougi kaisetu" => return : "(?:将棋|商議|娼妓|床几|象棋|省議|shougi|ｓｈｏｕｇｉ|しょうぎ|ショウギ|ｼｮｳｷﾞ)s*(?:回(?:折|折格子)|解説|開設|kaisetu|ｋａｉｓｅｔｕ|かいせつ|カイセツ|ｶｲｾﾂ)"
        // query : "shougi " => return : "(?:将棋|商議|娼妓|床几|象棋|省議|shougi|ｓｈｏｕｇｉ|しょうぎ|ショウギ|ｼｮｳｷﾞ)\s*"  // tailing space means exact match
        return regexpSegments.map(function(r) {return r ? '(?:'+r+')' : ''}).join('\\s*'); 
      });
  };

  function getRegExpStringFromWords(words, longestMatch) {
    if (!words.length) return '';
    if (words.length == 1) return regexpEscape(words[0]);

    // ex. words : ['a', 'ab', 'abc', 'abcd', 'ac', 'bc', 'cc']
    var singleChars = []; // ['a']
    var longerChars = {}; // {'a': ['b', 'bc', 'bcd', 'c'], 'b': ['c'], 'c': ['c']}
    words.forEach(function(word) {
      if (!word.length) return;
      if (word.length == 1) return singleChars.push(word);
      var head = word[0]; // charAt(0)
      var tail = word.slice(1);
      if (longerChars[head]) {
        longerChars[head].push(tail);
      } else {
        longerChars[head] = [tail];
      }
    });

    var regexpLonger = []; // ['a(RESULT_OF_RECURSION)', 'bc', 'cc']
    for (var x in longerChars) {
      var tails = longerChars[x];
      if (tails.length === 1) {
        regexpLonger.push( regexpEscape(x + tails) );
      } else { // tails.length > 1
        regexpLonger.push(
          regexpEscape(x) +   // recursion here! 
            '(?:' + Migemo.getRegExpStringFromWords(tails, longestMatch) + ')'
        );
      }
    }

    var single = (singleChars.length == 1) ? regexpEscape(singleChars[0]) 
                         : '[' + singleChars.map(regexpEscape).join('') + ']';
    var longer = regexpLonger.join('|');
    var str;
    if (!singleChars.length) {
      str = longer;
    } else if (!regexpLonger.length) {
      str = single;
    } else if (longestMatch) {
      str = longer + '|' + single;
    } else {
      str = single + '|' + longer;
    }

    return str
  };

  // RegExp.escape
  function regexpEscape(s) {
    return (s+'').replace(/[\u0000-\u002f\u003a-\u0040\u005b-\u0060\u007b-\u00a0]/g,'\\$&');
  };

})();
