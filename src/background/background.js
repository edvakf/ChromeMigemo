
var Migemo = Deferred.Migemo;
var config = Migemo.createConfigJa(null, '../dict/migemo-dict-ja');
var ready = false;
Migemo.initialize(config).next(function() {ready = true;});

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
       'takes about 1.5 minutes.'].join(''),
       query: query,
       action: action});

     var options = request.options || {};

     Deferred
     .next(function() {
       if (action == 'getRegExpString') {
         return Migemo.getRegExpString(query, options.lonestMatch);
       } else if (action == 'getCompletion') {
         return Migemo.getCompletion(query);
       }
     })
     .next(function(result) {
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
