
var Migemo = Deferred.Migemo;
var ready = false;

// called after the setting has been changed
function init() {
  getCompletionCache = {};
  var romanToHiraganaTable = localStorage['romanToHiraganaTable'] ? 
                JSON.parse(localStorage['romanToHiraganaTable']) : null;

  var config = Migemo.createConfigJa(romanToHiraganaTable);

  if (localStorage['dictionaryPaths']) {
    config.dictionaryPaths = JSON.parse(localStorage['dictionaryPaths']);
  } else {
    config.dictionaryPaths = ['../dict/migemo-dict-ja'];
  }
  //Migemo.debug = true;
  ready = false;

  return Migemo
  .initialize(config)
  .next(function() {
    var alphabets = 'abcdefghijklmnopqrstuvwxyz';
    return Deferred.loop(26, function(i) {
      return Migemo.getCompletion(alphabets.charAt(i));
    });
  })
  .next(function() {ready = true;});
};

// called only once, replace Migemo.getCompletion to implement caching
var getCompletionCache = {};
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
chrome.extension.onRequestExternal.addListener(
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
  }
);

init();
