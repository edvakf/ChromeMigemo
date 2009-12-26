
var ROMAN_TO_HIRAGANA_TABLE = {
  "a":"あ", "i":"い", "u":"う", "e":"え", "o":"お",
  "ka":"か", "ki":"き", "ku":"く", "ke":"け", "ko":"こ",
  "sa":"さ", "si":"し", "shi":"し", "su":"す", "se":"せ", "so":"そ",
  "ta":"た", "ti":"ち", "tu":"つ", "te":"て",  "to":"と",
  "chi":"ち", "tsu":"つ", 
  "na":"な", "ni":"に", "nu":"ぬ", "ne":"ね", "no":"の",
  "ha":"は", "hi":"ひ", "fu":"ふ", "hu":"ふ", "he":"へ", "ho":"ほ",
  "ma":"ま", "mi":"み", "mu":"む", "me":"め", "mo":"も",
  "ya":"や", "yu":"ゆ", "yo":"よ",
  "ra":"ら", "ri":"り", "ru":"る", "re":"れ", "ro":"ろ",
  "wa":"わ", "wo":"を", "n":"ん", "nn":"ん",
  "ba":"ば", "bi":"び", "bu":"ぶ", "be":"べ", "bo":"ぼ",
  "ga":"が", "gi":"ぎ", "gu":"ぐ", "ge":"げ", "go":"ご",
  "za":"ざ", "zi":"じ", "ji":"じ", "zu":"ず", "ze":"ぜ", "zo":"ぞ",
  "da":"だ", "di":"ぢ", "du":"づ", "de":"で", "do":"ど",
  "sha":"しゃ", "shu":"しゅ", "she":"しぇ", "sho":"しょ", 
  "sya":"しゃ", "syu":"しゅ","syo":"しょ",
  "nya":"にゃ", "nyu":"にゅ", "nyo":"にょ", 
  "ja":"じゃ", "ji":"じ", "ju":"じゅ", "je":"じぇ", "jo":"じょ", 
  "-":"ー", "xtu":"っ", "dhi":"でぃ",
  "bya":"びゃ", "byu":"びゅ", "byo":"びょ",
  "gya":"ぎゃ", "gyu":"ぎゅ", "gyo":"ぎょ", 
  "kya":"きゃ", "kyu":"きゅ", "kyo":"きょ",
  "cha":"ちゃ", "chu":"ちゅ", "cho":"ちょ", 
  "tya":"ちゃ", "tyu":"ちゅ", "tyo":"ちょ",
  "hya":"ひゃ", "hyu":"ひゅ", "hyo":"ひょ", 
  "thi":"てぃ",
  "la":"ぁ", "li":"ぃ", "lu":"ぅ", "le":"ぇ", "lo":"ぉ", 
  "xa":"ぁ", "xi":"ぃ", "xu":"ぅ", "xe":"ぇ", "xo":"ぉ", 
  "xya":"ゃ", "xyu":"ゅ", "xyo":"ょ",
  "pa":"ぱ", "pi":"ぴ", "pu":"ぷ", "pe":"ぺ", "po":"ぽ",
  "va":"ゔぁ", "vi":"ゔぃ", "vu":"ゔ", "ve":"ゔぇ", "vo":"ゔぉ", 
  "wo":"を"
};

var Migemo = Deferred.Migemo;
var ready = false;

// called after the setting has been changed
function init() {
  getCompletionCache = {};
  if (localStorage['romanToHiraganaTable']) {
    var romanToHiraganaTable = JSON.parse(localStorage['romanToHiraganaTable']);
  } else {
    var romanToHiraganaTable = ROMAN_TO_HIRAGANA_TABLE;
  }
  var config = Migemo.createConfigJa(romanToHiraganaTable);
  if (localStorage['dictionaryPaths']) {
    config.dictionaryPaths = JSON.parse(localStorage['dictionaryPaths']);
  } else {
    config.dictionaryPaths = ['http://atsushi-takayama.com/migemo/migemo-dict-ja'];
  }
  Migemo.debug = true;
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
