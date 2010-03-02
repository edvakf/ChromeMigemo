// japanese locale for JSDeferred-Migemo
// License : The MIT License <http://www.opensource.org/licenses/mit-license.php>
//   Copyright (c) 2009 Atsushi TAKAYAMA (taka.atsushi (a) gmail.com)
// Depends on :
//   jsdeferred-migemo <http://github.com/edvakf/JSDeferred-Migemo>

(function() {
  if (!window.Deferred || !window.Deferred.Migemo) return;

  var getRegExpStringFromWords = Deferred.Migemo.getRegExpStringFromWords;

  Deferred.Migemo.createConfigJa = function(romanToHiraganaTable) {
    if (!romanToHiraganaTable) romanToHiraganaTable = ROMAN_TO_HIRAGANA_TABLE;
    romanToHiraganaTable['xtu'] = 'っ'; // not configurable

    var all = [];
    var tails = {};
    var max_head_len = 0;
    for (var x in romanToHiraganaTable) {
      all.push(x);
      for (var i=1; i<x.length; i++) {
        if (max_head_len < i) max_head_len = i;
        var head = x.slice(0,i);
        var tail = x.slice(i);
        if (tails[head]) {
          tails[head].push(tail);
        } else {
          tails[head] = [tail];
        }
      }
    }
    var re_all = new RegExp('('+getRegExpStringFromWords(all, true)+')', 'g');

    // returns 2D array (each segment of query & each candidate)
    function expandQuery(queries) { // queries : 'TaBeruna kiken'
      return queries
        .split(/\s+|(?=[A-Z])/).map(function(query) {
          query = query.toLowerCase(); // ['ta', 'beruna', 'kiken']
          var hiragana = '';
          var normalized = normalizeDoubleConsonants(query);
          var segments = normalized.split(re_all).filter(function(s) {return s!=''});
          var s;
          while (s = segments.shift()) {
            // ex. when the last letter is 'n' don't decide it's 'ん', but leave possibility for 'な', 'にゃ', etc
            if (tails[s+segments.join('')]) break;
            // else
            if (romanToHiraganaTable[s]) hiragana += romanToHiraganaTable[s];
            else break;
          }
          // if query was successfully turned into hiragana
          if (!s) return [query, hiragana];
          // if there is a remainder
          var remain = s + segments.join('');
          if (!tails[remain]) return [query];
          var hiraganas = tails[remain].map(function(tail) { return hiragana + romanToHiraganaTable[remain+tail]; });
          // add tailing 'っ'
          if (remain.length == 1 && hiragana.slice(-1) !== 'っ') {
            hiraganas = hiraganas.concat(tails[remain].map(function(tail) { return hiragana + 'っ' + romanToHiraganaTable[remain+tail]; }))
          }
          // removes redundancy ["ち","ちゃ","ちょ","ちゅ"] -> ["ち"]
          hiraganas.sort(function(a,b) {return a.length - b.length});
          for (var i=0; i<hiraganas.length; i++) {
            for (var j=i+1; j<hiraganas.length;) {
              if (hiraganas[j].indexOf(hiraganas[i]) === 0) hiraganas.splice(j, 1);
              else j++;
            }
          }
          return [query].concat(hiraganas);
        });
    }

    var config = {
      locale : 'ja',
      version : '0.7.0', // version is to be used when auto-upgrading dictionary database
      dictionaryPaths : ['dict/migemo-dict-ja'],
      expandQuery : expandQuery,
      expandResult : expandResult
    };
    return config;
  }

  // default ROMAN_TO_HIRAGANA_TABLE
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
    "rya":"りゃ", "ryu":"りゅ", "ryo":"りょ", 
    "thi":"てぃ",
    "la":"ぁ", "li":"ぃ", "lu":"ぅ", "le":"ぇ", "lo":"ぉ", 
    "xa":"ぁ", "xi":"ぃ", "xu":"ぅ", "xe":"ぇ", "xo":"ぉ", 
    "xya":"ゃ", "xyu":"ゅ", "xyo":"ょ",
    "pa":"ぱ", "pi":"ぴ", "pu":"ぷ", "pe":"ぺ", "po":"ぽ",
    "va":"ゔぁ", "vi":"ゔぃ", "vu":"ゔ", "ve":"ゔぇ", "vo":"ゔぉ"
  };

  var hankakuToZenkakuTable = {
    "a":"ａ","b":"ｂ","c":"ｃ","d":"ｄ","e":"ｅ","f":"ｆ","g":"ｇ",
    "h":"ｈ","i":"ｉ","j":"ｊ","k":"ｋ","l":"ｌ","m":"ｍ","n":"ｎ",
    "o":"ｏ","p":"ｐ","q":"ｑ","r":"ｒ","s":"ｓ","t":"ｔ","u":"ｕ",
    "v":"ｖ","w":"ｗ","x":"ｘ","y":"ｙ","z":"ｚ",
    "A":"Ａ","B":"Ｂ","C":"Ｃ","D":"Ｄ","E":"Ｅ","F":"Ｆ","G":"Ｇ",
    "H":"Ｈ","I":"Ｉ","J":"Ｊ","K":"Ｋ","L":"Ｌ","M":"Ｍ","N":"Ｎ",
    "O":"Ｏ","P":"Ｐ","Q":"Ｑ","R":"Ｒ","S":"Ｓ","T":"Ｔ","U":"Ｕ",
    "V":"Ｖ","W":"Ｗ","X":"Ｘ","Y":"Ｙ","Z":"Ｚ",
    "1":"１","2":"２","3":"３","4":"４","5":"５","6":"６","7":"７",
    "8":"８","9":"９","0":"０",
    "~":"〜","!":"！","@":"＠","#":"＃","$":"＄","%":"％","^":"＾",
    "&":"＆","*":"＊","(":"（",")":"）","_":"＿","+":"＋","{":"｝",
    "}":"｝","[":"［","]":"］","|":"｜","\\":"＼",":":"：",";":"；",
    "\"":"＼","<":"＜",",":"，",">":"＞",".":"．","?":"？","/":"／"
  };

  var hiraganaToKatakanaTable = {
    "あ":"ア","い":"イ","う":"ウ","え":"エ","お":"オ",
    "か":"カ","き":"キ","く":"ク","け":"ケ","こ":"コ",
    "さ":"サ","し":"シ","す":"ス","せ":"セ","そ":"ソ",
    "た":"タ","ち":"チ","つ":"ツ","て":"テ","と":"ト",
    "な":"ナ","に":"ニ","ぬ":"ヌ","ね":"ネ","の":"ノ",
    "は":"ハ","ひ":"ヒ","ふ":"フ","へ":"ヘ","ほ":"ホ",
    "ま":"マ","み":"ミ","む":"ム","め":"メ","も":"モ",
    "や":"ヤ","ゆ":"ユ","よ":"ヨ","ゔ":"ヴ",
    "ら":"ラ","り":"リ","る":"ル","れ":"レ","ろ":"ロ",
    "わ":"ワ","ゐ":"ヰ","ゑ":"ヱ","を":"ヲ","ん":"ン",
    "が":"ガ","ぎ":"ギ","ぐ":"グ","げ":"ゲ","ご":"ゴ",
    "ざ":"ザ","じ":"ジ","ず":"ズ","ぜ":"ゼ","ぞ":"ゾ",
    "だ":"ダ","ぢ":"ヂ","づ":"ヅ","で":"デ","ど":"ド",
    "ば":"バ","び":"ビ","ぶ":"ブ","べ":"ベ","ぼ":"ボ",
    "ぱ":"パ","ぴ":"ピ","ぷ":"プ","ぺ":"ペ","ぽ":"ポ",
    "ゃ":"ャ","ゅ":"ュ","ょ":"ョ",
    "ぁ":"ァ","ぃ":"ィ","ぅ":"ゥ","ぇ":"ェ","ぉ":"ォ",
    "っ":"ッ","ヵ":"ヵ","ヶ":"ヶ"
  };

  var zenkakuToHankakuTable = {
    "ア":"ｱ","イ":"ｲ","ウ":"ｳ","エ":"ｴ","オ":"ｵ",
    "カ":"ｶ","キ":"ｷ","ク":"ｸ","ケ":"ｹ","コ":"ｺ",
    "サ":"ｻ","シ":"ｼ","ス":"ｽ","セ":"ｾ","ソ":"ｿ",
    "タ":"ﾀ","チ":"ﾁ","ツ":"ﾂ","テ":"ﾃ","ト":"ﾄ",
    "ナ":"ﾅ","ニ":"ﾆ","ヌ":"ﾇ","ネ":"ﾈ","ノ":"ﾉ",
    "ハ":"ﾊ","ヒ":"ﾋ","フ":"ﾌ","ヘ":"ﾍ","ホ":"ﾎ",
    "マ":"ﾏ","ミ":"ﾐ","ム":"ﾑ","メ":"ﾒ","モ":"ﾓ",
    "ヤ":"ﾔ","ユ":"ﾕ","ヨ":"ﾖ","ヴ":"ｳﾞ",
    "ラ":"ﾗ","リ":"ﾘ","ル":"ﾙ","レ":"ﾚ","ロ":"ﾛ",
    "ワ":"ﾜ","ヲ":"ｦ","ン":"ﾝ",
    "ガ":"ｶﾞ","ギ":"ｷﾞ","グ":"ｸﾞ","ゲ":"ｹﾞ","ゴ":"ｺﾞ",
    "ザ":"ｻﾞ","ジ":"ｼﾞ","ズ":"ｽﾞ","ゼ":"ｾﾞ","ゾ":"ｿﾞ",
    "ダ":"ﾀﾞ","ヂ":"ﾁﾞ","ヅ":"ﾂﾞ","デ":"ﾃﾞ","ド":"ﾄﾞ",
    "バ":"ﾊﾞ","ビ":"ﾋﾞ","ブ":"ﾌﾞ","ベ":"ﾍﾞ","ボ":"ﾎﾞ",
    "パ":"ﾊﾟ","ピ":"ﾋﾟ","プ":"ﾌﾟ","ペ":"ﾍﾟ","ポ":"ﾎﾟ",
    "ャ":"ｬ","ュ":"ｭ","ョ":"ｮ",
    "ァ":"ｧ","ィ":"ｨ","ゥ":"ｩ","ェ":"ｪ","ォ":"ｫ",
    "ッ":"ｯ"
  };

  var hiraganaToHankakuTable = {
    "あ":"ｱ","い":"ｲ","う":"ｳ","え":"ｴ","ｵ":"オ",
    "か":"ｶ","き":"ｷ","く":"ｸ","け":"ｹ","こ":"ｺ",
    "さ":"ｻ","し":"ｼ","す":"ｽ","せ":"ｾ","そ":"ｿ",
    "た":"ﾀ","ち":"ﾁ","つ":"ﾂ","て":"ﾃ","と":"ﾄ",
    "な":"ﾅ","に":"ﾆ","ぬ":"ﾇ","ね":"ﾈ","の":"ﾉ",
    "は":"ﾊ","ひ":"ﾋ","ふ":"ﾌ","へ":"ﾍ","ほ":"ﾎ",
    "ま":"ﾏ","み":"ﾐ","む":"ﾑ","め":"ﾒ","も":"ﾓ",
    "や":"ﾔ","ゆ":"ﾕ","よ":"ﾖ","ゔ":"ｳﾞ",
    "ら":"ﾗ","り":"ﾘ","る":"ﾙ","れ":"ﾚ","ろ":"ﾛ",
    "わ":"ﾜ","を":"ｦ","ん":"ﾝ",
    "が":"ｶﾞ","ぎ":"ｷﾞ","ぐ":"ｸﾞ","げ":"ｹﾞ","ご":"ｺﾞ",
    "ざ":"ｻﾞ","じ":"ｼﾞ","ず":"ｽﾞ","ぜ":"ｾﾞ","ぞ":"ｿﾞ",
    "だ":"ﾀﾞ","ぢ":"ﾁﾞ","づ":"ﾂﾞ","で":"ﾃﾞ","ど":"ﾄﾞ",
    "ば":"ﾊﾞ","び":"ﾋﾞ","ぶ":"ﾌﾞ","べ":"ﾍﾞ","ぼ":"ﾎﾞ",
    "ぱ":"ﾊﾟ","ぴ":"ﾋﾟ","ぷ":"ﾌﾟ","ぺ":"ﾍﾟ","ぽ":"ﾎﾟ",
    "ゃ":"ｬ","ゅ":"ｭ","ょ":"ｮ",
    "ぁ":"ｧ","ぃ":"ｨ","ぅ":"ｩ","ぇ":"ｪ","ぉ":"ｫ",
    "っ":"ｯ"
  };

  var all = [];
  for (var x in hankakuToZenkakuTable) all.push(x);
  var str = getRegExpStringFromWords(all,true);
  var re10 = new RegExp('^(?:' + str + ')+$');
  var re11 = new RegExp( str , 'g');

  all = [];
  for (var x in hiraganaToKatakanaTable) all.push(x);
  var str = getRegExpStringFromWords(all,true);
  var re20 = new RegExp('^(?:' + str + ')+$');
  var re21 = new RegExp( str , 'g');

  all = [];
  for (var x in zenkakuToHankakuTable) all.push(x);
  var str = getRegExpStringFromWords(all,true);
  var re30 = new RegExp('^(?:' + str + ')+$');
  var re31 = new RegExp( str , 'g');

  all = [];
  for (var x in hiraganaToHankakuTable) all.push(x);
  var str = getRegExpStringFromWords(all,true);
  var re40 = new RegExp('^(?:' + str + ')+$');
  var re41 = new RegExp( str , 'g');

  function expandResult(completion) {
    var res = [completion];
    if (re11.test(completion)) { // hankakuToZenkaku
      re11.lastIndex = 0;
      res.push( completion.replace(re11, function(s) {return hankakuToZenkakuTable[s];}) );
    }
    if (re21.test(completion)) { // hiraganaToKatakana
      re21.lastIndex = 0;
      res.push( completion.replace(re21, function(s) {return hiraganaToKatakanaTable[s];}) );
    } 
    if (re31.test(completion)) { // hiraganaToHankaku
      re31.lastIndex = 0;
      res.push( completion.replace(re31, function(s) {return zenkakuToHankakuTable[s];}) );
    } 
    if (re41.test(completion)) { // hiraganaToHankaku
      re41.lastIndex = 0;
      res.push( completion.replace(re41, function(s) {return hiraganaToHankakuTable[s];}) );
    }
    return res;
  }

  function normalizeDoubleConsonants(roman) {
    return roman.replace(/([qwrtypsdfghjklzxvb])\1/g, 'xtu$1');
  }

})();
