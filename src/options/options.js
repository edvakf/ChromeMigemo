function $(id) {
  return document.getElementById(id);
};

function syncGet(url) {
  var xhr = new XMLHttpRequest;
  xhr.open('GET', url, false);
  xhr.send();
  return xhr.responseText;
}

function save() {
  var setting = {};
  var dics = getDictionaries();
  if (dics === null) return;
  if (!validateCustomDictionary()) return;
  if (!validateRomanToHiragana()) return;
  if ($('custom-dictionary').value != localStorage['CUSTOM_DICTIONARY'] ||
    localStorage['DICTIONARIES'] != JSON.stringify(dics)) {
      // force create dictionary
    localStorage['MIGEMO_LOCALE'] = '';
  }

  localStorage['DICTIONARIES'] = JSON.stringify(dics);
  localStorage['CUSTOM_DICTIONARY'] = $('custom-dictionary').value;
  localStorage['ROMAN_TO_HIRAGANA'] = $('roman-to-hiragana').value;

  var button = $('save');
  button.value = 'saving';
  button.disabled = true;
  var i = 0;
  var timer = setInterval(function() {button.value = 'saving' + '...'.slice(0, ++i%4);}, 500);
  var bg = chrome.extension.getBackgroundPage();
  bg.init()
  .next(function() {button.value = 'saved!!'; clearTimeout(timer);})
  .wait(1)
  .next(function() {button.disabled = false; button.value = 'save'})
};

function load(default_values) {
  if (!default_values && localStorage['CUSTOM_DICTIONARY']) {
    $('custom-dictionary').value = localStorage['CUSTOM_DICTIONARY'];
  }
  if (!default_values && localStorage['ROMAN_TO_HIRAGANA']) {
    $('roman-to-hiragana').value = localStorage['ROMAN_TO_HIRAGANA'];
  } else {
    $('roman-to-hiragana').value = syncGet('/options/default_roman_to_hiragana.txt');
  }
  forEach( document.querySelectorAll('.dictionary'), function(d) { d.checked = false; });
  if (!default_values && localStorage['DICTIONARIES']) {
    var dics = JSON.parse(localStorage['DICTIONARIES']);
  } else {
    var dics = syncGet('/options/default_dictionaries.txt').trim().split(/\s+/);
  }
  dics.forEach(function(dic) { $(dic).checked = true; });
};

function forEach(likeArray, func) {
  Array.prototype.forEach.call(likeArray, func);
};

function getDictionaries() {
  var dics = [];
  forEach(document.querySelectorAll('.dictionary'), function(dic) {
      if (dic.checked) dics.push(dic.id);
  });
  if (dics.length == 0) {
    alert('At least one dictionary needs to be enabled.');
    return null;
  }
  return dics;
};

function validateCustomDictionary() {
  var lines = $('custom-dictionary').value.split(/\r?\n/);
  for (var i=0; i<lines.length; i++) {
    var line = lines[i].trim();
    if (line === '' || line.charAt(0) === '#') continue;
    if (line.split(/\s+/) < 2) {
      alert('Values missing : ' + line);
      return false;
    }
  }
  return true;
}

function validateRomanToHiragana() {
  var mapping = {};
  var lines = $('roman-to-hiragana').value.split(/\r?\n/);
  for (var i=0; i<lines.length; i++) {
    var line = lines[i].trim();
    if (line === '' || line.charAt(0) === '#') continue;
    var map = line.split(/\s+/);
    if (map.length !== 2) {
      alert('Key-Value must be a pair : ' + line);
      return false;
    }
    var key = map[0], value = map[1];
    if (mapping[key]) {
      alert(key + ' is begin assigned more than once.');
      return false;
    }
    mapping[key] = value;
  }
  if (mapping['xtu'] !== 'っ') {
    alert('You cannot change assignment for "xtu"');
    return null;
  }
  return true;
};

function setTextAreaHeight() {
  forEach( document.querySelectorAll('textarea'), function(ta) {
    if (ta.value.split('\n').length > 15) ta.rows = 20;
  });
}

document.addEventListener('DOMContentLoaded', function() {
  load();
  setTextAreaHeight();

  document.getElementById('save').onclick = function() {
    save();
  };
  document.getElementById('load').onclick = function() {
    load();
  };
  document.getElementById('default').onlick = function() {
    load(true);
  };
}, false);
