
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
function init() {
  if (localStorage['romanToHiraganaTable']) {
    var romanToHiraganaTable = JSON.parse(localStorage['romanToHiraganaTable']);
  } else {
    var romanToHiraganaTable = ROMAN_TO_HIRAGANA_TABLE;
  }
  var config = Migemo.createConfigJa(romanToHiraganaTable);
  if (localStorage['dictionaryPaths']) {
    config.dictionaryPaths = JSON.parse(localStorage['dictionaryPaths']);
  } else {
    config.dictionaryPaths = ['../dict/migemo-dict-ja'];
  }
  Migemo.debug = true;
  ready = false;

  return Migemo
  .initialize(config)
  .next(function() {return createWildcards(romanToHiraganaTable);})
  .next(function() {ready = true;});
};

var cache = {};
function createWildcards(romanToHiraganaTable) {
  var keys = [];
  for (var x in romanToHiraganaTable) {
    for (var i=0; i<x.length; i++) {
      var key = x.slice(0,i+1);
      if (keys.indexOf(key) < 0) keys.push(key);
    }
  }
  Deferred.loop(keys.length, function(i) {
    var key = keys[i];
    return Migemo.getCompletion(key)
      .next(function(res) {
        cache[key] = res;
      })
  })
  .next(function() {
    var getCompletion = Migemo.getCompletion;
    Migemo.getCompletion = function(query) {
      if (cache[query]) return Deferred.next(function() {return cache[query];});
      return getCompletion(query);
    };
  });
};

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
