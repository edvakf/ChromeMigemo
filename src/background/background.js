
(function() {
  var Migemo = Deferred.Migemo;
  var ready = false;
  var getCompletionCache = {};

  // utils
  function syncGet(url) {
    var xhr = new XMLHttpRequest;
    xhr.open('GET', url, false);
    xhr.send();
    return xhr.responseText;
  };
  function parseRomanToHiragana(text) {
    var mapping = {};
    var lines = text.split(/\r?\n/);
    for (var i=0; i<lines.length; i++) {
      var line = lines[i].trim();
      if (line === '' || line.charAt(0) === '#') continue;
      var map = line.split(/\s+/);
      var key = map[0], value = map[1];
      mapping[key] = value;
    }
    return mapping;
  };

  // called after the setting has been changed
  function init() {
    getCompletionCache = {};
    if (localStorage['ROMAN_TO_HIRAGANA']) {
      var romanToHiragana = localStorage['ROMAN_TO_HIRAGANA'];
    } else {
      var romanToHiragana = syncGet('/options/default_roman_to_hiragana.txt');
    }
    var romanToHiraganaTable = parseRomanToHiragana(romanToHiragana);

    var config = Migemo.createConfigJa(romanToHiraganaTable);

    if (localStorage['DICTIONARIES']) {
      var dics = JSON.parse(localStorage['DICTIONARIES']);
    } else {
      var dics = syncGet('/options/default_dictionaries.txt').trim().split(/\s+/);
    }
    config.dictionaryPaths = dics.map(function(d) {return '/background/dict/migemo-dict-' + d});
    if (localStorage['CUSTOM_DICTIONARY']) {
      config.customDictionary = localStorage['CUSTOM_DICTIONARY'];
    }
    if (config.locale != localStorage['MIGEMO_LOCALE'] || 
        config.version != localStorage['MIGEMO_DICT_VERSION']) {
      config.forceCreateDatabase = true;
    }

    //Migemo.debug = true;
    ready = false;

    return Migemo
    .initialize(config)
    .next(function() {
      localStorage['MIGEMO_LOCALE'] = config.locale;
      localStorage['MIGEMO_DICT_VERSION'] = config.version;
    })
    .next(function() {
      var alphabets = 'abcdefghijklmnopqrstuvwxyz';
      return Deferred.loop(26, function(i) {
        return Migemo.getCompletion(alphabets.charAt(i));
      });
    })
    .next(function() {ready = true;})
  };

  // called only once, replace Migemo.getCompletion to implement caching
  var getCompletion = Migemo.getCompletion;
  Migemo.getCompletion = function(query) {
    var queries = query.split(/\s+|(?=[A-Z])/).map(function(s) {return s.toLowerCase();});
    var lastQuery = queries.pop();
    var cached = getCompletionCache[lastQuery];
    if (cached) {
      if (queries.length === 0) {
        return Deferred.next(function() {return [cached];});
      } else {
        var _query = queries.join(' ') + ' ';
        return getCompletion(_query)
          .next(function(res) {
            res.push(cached);
            return res;
          });
      }
    } else {
      if (lastQuery.length <= 2) {
        return getCompletion(query)
          .next(function(res) {
            getCompletionCache[lastQuery] = res[res.length-1];
            return res;
          });
      } else {
        return getCompletion(query);
      }
    } 
  }

  // called when there is a connection
  chrome.extension.onMessageExternal.addListener(
    function(request, sender, sendResponse) {
      var domain = sender.tab.url.match(/^.*?:\/\/(.*)\//)[1] || 'localhost';
      console.log("Request : " + request + 
                  sender.tab ? "from a content script: " + domain :
                  "from extension: " + sender.id);

       // request.action : 'getRegExpString' | 'getCompletion'
       var query = request.query;
       var action = request.action;
       if (!query || !action) return sendResponse({
         error: 'Bad request. Either query or action filed is empty.',
         query: query,
         action: action});
       if (!ready) return sendResponse({ 
         error: ['Migemo server is not ready.',
         'Creating dictionary database usually',
         'takes about 1 minutes.'].join(''),
         query: query,
         action: action});

       Deferred
       .next(function() {
         if (action == 'getRegExpString') {
           return Migemo.getRegExpString(query);
         } else if (action == 'getCompletion') {
           return Migemo.getCompletion(query);
         }
       })
       .next(function(result) {
         console.log(result);
         sendResponse({action: action, query: query, result: result});
       })
       .error(function(e) {
         console.log([e,request]);
         sendResponse({
           error: 'Internal error. Something went wrong.',
           action: action,
           query: query
         });
       })

       return true;
    }
  );

  window.init = init;
})();

init();
