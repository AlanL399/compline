require(['jquery','moment','calendar','chant-element'], function($,moment,calendar) {
  'use strict';
  $('select').val('');
  var localStorage = window.localStorage;
  try {
    var mod = '__storage test__';
    localStorage.setItem(mod, mod);
    localStorage.removeItem(mod);
  } catch(e) {
    localStorage = {};
  }
  if(!('region' in localStorage)) localStorage.region = '';
  if(!('fullNotation' in localStorage)) localStorage.fullNotation = '0';
  if(!('fullNotationChapter' in localStorage)) localStorage.fullNotationChapter = '1';
  if(!('fullNotationPrayers' in localStorage)) localStorage.fullNotationPrayers = '0';
  if(!('autoSelectRegion' in localStorage)) localStorage.autoSelectRegion = '1';
  var usedRegions = {};
  $('#selectRegion').append('<option value="">None</option>'+Object.keys(calendar.roman.regionCodeMap).map(function(code){
    var name = calendar.roman.regionCodeMap[code];
    if(name in usedRegions) return '';
    usedRegions[name] = '';
    return '<option value="'+code+'"">'+name+'</option>';
  }).join('')).val(localStorage.region);
  var $optionsMenu = $('#options-menu');
  $(document.body).click(function(e){
    var $target = $(e.target);
    if($target.parents().is($optionsMenu)) {
      if(!$target.is('a,input,select,label')) $optionsMenu.toggleClass('showing');
    } else {
      $optionsMenu.removeClass('showing');  
    }
  });
  var toggles = {};
  var fullNotation = toggles.fullNotation = function(newVal) {
    if(typeof newVal === 'undefined') return !!parseInt(localStorage.fullNotation);
    updateToggle('fullNotation',!!newVal);
    localStorage.fullNotation = newVal? 1 : 0;
    setPsalms();
    setCanticle();
  };
  var fullNotationChapter = toggles.fullNotationChapter = function(newVal) {
    if(typeof newVal === 'undefined') return !!parseInt(localStorage.fullNotationChapter);
    updateToggle('fullNotationChapter',!!newVal);
    localStorage.fullNotationChapter = newVal? 1 : 0;
  };
  var fullNotationPrayers = toggles.fullNotationPrayers = function(newVal) {
    if(typeof newVal === 'undefined') return !!parseInt(localStorage.fullNotationPrayers);
    updateToggle('fullNotationPrayers',!!newVal);
    localStorage.fullNotationPrayers = newVal? 1 : 0;
  };
  var autoSelectRegion = toggles.autoSelectRegion = function(newVal) {
    if(typeof newVal === 'undefined') return !!parseInt(localStorage.autoSelectRegion);
    updateToggle('autoSelectRegion',!!newVal);
    localStorage.autoSelectRegion = newVal? 1 : 0;
    if(newVal) doAutoSelectRegion();
  };
  var selectRegion = function(newVal) {
    if(typeof newVal === 'undefined') return !!parseInt(localStorage.autoSelectRegion);
    $('#selectRegion').val(newVal);
    localStorage.region = $('#selectRegion').val();
  };
  $('input[toggle]').change(function(e){
    var $this = $(this);
    var toggle = toggles[$this.attr('toggle')];
    toggle(this.checked);
  });
  $('#selectRegion').change(function(e){
    selectRegion($(this).val());
  });
  function updateToggle(toggle,val) {
    if(typeof val === 'undefined') {
      var $toggle = $('input[toggle='+toggle+']');
      val = toggles[toggle]();
      $toggle.prop('checked',val);
    }
    switch(toggle) {
      case 'autoSelectRegion':
        $('#selectRegion').prop('disabled', val);
        break;
      case 'fullNotationPrayers':
        $('.notated-prayer').toggle(val);
        $('.pointed-prayer').toggle(!val);
        break;
      case 'fullNotationChapter':
        $('.notated-chapter').toggle(val);
        $('.pointed-chapter').toggle(!val);
        break;
    }
  }
  $.each(toggles, function(toggle){
    updateToggle(toggle);
  });
  function doAutoSelectRegion() {
    $.getJSON("https://freegeoip.app/json/", function(result){
      if(result.country_code in calendar.roman.regionCodeMap) {
        selectRegion(result.country_code);
      } else {
        var test = result.country_code + '-' + result.region_code;
        if(test in calendar.roman.regionCodeMap) {
          selectRegion(test);
        } else {
          console.info('Unknown Region:', result);
        }
      }
      console.info('Country: ' + result.country_name + '\n' + 'Code: ' + result.country_code);
      window.ipGeo = ipGeo = result;
    });
  }
  var ipGeo;
  if(parseInt(localStorage.autoSelectRegion)) {
    doAutoSelectRegion();
  }
  $.QueryString = (function (a) {
      if (a === "") return {};
      var b = {};
      for (var i = 0; i < a.length; ++i) {
          var p = a[i].split('=');
          if (p.length != 2) continue;
          b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
      }
      if (b.successMsg) showAlert(false, b.successMsg);
      if (b.failMsg) showAlert(true, b.failMsg);
      return b;
  })(window.location.search.substr(1).split('&'));
  var date = moment();
  
  $('#date').val(date.format("YYYY-MM-DD"));
  var changeDateBy = function(days) {
    return function(i,current) {
      var m = moment(current);
      if(!m.isValid()) {
        m = moment();
      } else {
        m.add(days,'days');
      }
      return m.format("YYYY-MM-DD");
    };
  };
  var nextDay = function(week) {
    $('#date').val(changeDateBy(week? 7 : 1)).change();
  };
  var prevDay = function(week) {
    $('#date').val(changeDateBy(week? -7 : -1)).change();
  };
  $(document).on('click', function(e) {
    $('.btn-group.open').removeClass('open');
  }).on('click', '[data-toggle="dropdown"]', function(e) {
    var $openBtns = $('.btn-group.open');
    $(this).parent('.btn-group').toggleClass('open');
    $openBtns.removeClass('open');
    e.stopPropagation();
  }).on('keypress', function(e){
    switch(e.which) {
      case 106: // j
      case 74:
        prevDay(e.shiftKey);
        break;
      case 107: // k
      case 75:
        nextDay(e.shiftKey);
        break;
    }
  });
  var day = date.day();
  var dayName;
  var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  if($.QueryString.day) {
    var test = $.QueryString.day;
    if(test in days) {
      day = test;
    } else {
      test = days.indexOf(test);
      if(test in days) {
        day = test;
      }
    }
  }
  // type should be '-po' for paschal octave, '-pt' for paschal time, or '-asd' for all souls' day, or '' for regular
  var currentCanticle = '';
  var setCanticle = function(type) {
    type = (typeof type == 'undefined')? currentCanticle.replace(/_full$/,'') : type;
    var antType = type;
    if(fullNotation()) type += '_full';
    if(type === currentCanticle) return;
    currentCanticle = type;
    var ant = "<chant-gabc src='canticle-ant"+antType+".gabc'></chant-gabc>";
    if(antType==='-pt') {
      antType = '';
      type = type.slice(3);
    }
    var psalm = "<chant-gabc src='canticle-psalm"+type+".gabc'></chant-gabc>";
    var gotData = function(data){
      var html = ant + psalm + data;
      if(antType === '-po') {
        html += "<chant-gabc src='haec-dies.gabc'></chant-gabc>";
      } else {
        html += ant;
      }
      $('#canticle').empty().append(html);
    };
    $('#canticle').empty();
    if(fullNotation()) {
      gotData('');
    } else {
      $.get('canticle-psalm'+type+'.html',gotData);
    }
  };
  var currentPsalms = {};
  var setPsalms = function(day,paschalTime) {
    if(typeof(day) === 'undefined') {
      day = currentPsalms.day;
      paschalTime = paschalTime || currentPsalms.paschalTime;
    } else {
      if(currentPsalms.day == day && currentPsalms.paschalTime == paschalTime) return;
      currentPsalms.day = day;
      currentPsalms.paschalTime = paschalTime;
    }
    if(typeof day == 'undefined' && typeof paschalTime == 'undefined') return;
    // Only process if things have changed since the last time this function was called.
    if(currentPsalms.day == day && currentPsalms.paschalTime == paschalTime && currentPsalms.full == fullNotation()) return;
    currentPsalms.fullNotation = fullNotation();
    var ant = '',
        psalm = '',
        antinit = '',
        pt = '',
        full = fullNotation()? '_full' : '';
    if(day === 'triduum') {
      day = 0;
      pt = '-triduum';
      full = '';
    } else if(day === 'asd') {
      pt = '';
      psalm = "<chant-gabc src='psalms/"+day+"/psalm"+pt+full+".gabc'></chant-gabc>";
    } else {
      pt = paschalTime?'-PT':'';
      ant = paschalTime?
        "<chant-gabc src='psalms/ant-PT.gabc'></chant-gabc>" :
        "<chant-gabc src='psalms/0/ant.gabc'></chant-gabc>";
      antinit = paschalTime?
        "<chant-gabc src='psalms/ant-PT.gabc'></chant-gabc>" :
        "<chant-gabc src='psalms/0/ant-init.gabc'></chant-gabc>";
      if(paschalTime === 'no-antiphon') ant = '';
      psalm = "<chant-gabc src='psalms/0/psalm"+pt+full+".gabc'></chant-gabc>";
      dayName = days[day];
    }
    var gotData = function(data){
      var html = antinit + psalm + data + ant;
      $('#placeholder').empty().append(html);
    };
    if(full) {
      gotData('');
    } else if(typeof(day) !== 'undefined') {
      $.get('psalms/0/psalm-verses'+pt+'.html',gotData).fail(function(){
        $.get('psalms/0/psalm-verses.html',gotData);
      });
    }
  };
  var formattedRank = function(rank) {
    switch(rank) {
      case 1:
        return 'I Class';
      case 2:
        return 'II Class';
      case 3:
        return 'III Class';
      case 5:
        return 'Commemoration';
      default:
        return 'Feria';
    }
  };
  var setDate = function(date,region) {
    var dates = calendar.datesForMoment(date);
    var d = calendar.getFeastForDate(date,region);
    //show and hide [include] and [exclude] elements based on the date
    $('[exclude]').each(function(){
      var $this = $(this);
      $this.toggle(!calendar.dateMatches(date, $this.attr('exclude')));
    });
    $('[include]').each(function(){
      var $this = $(this);
      $this.toggle(calendar.dateMatches(date, $this.attr('include')));
    });
    var dateMatchesSelectDate = function($elem) {
      var selectDay = $elem.attr('select-day');
      if(selectDay) {
        selectDay = calendar.dateMatches(date, selectDay);
      } else {
        selectDay = true;
      }
      var matches = calendar.dateMatches(date, $elem.attr('select-date'));
      return matches && selectDay;
    };
    //select inputs based on date
    $('.dropdown-menu a[select-date]').each(function(){
      var $this = $(this);
      var matches = dateMatchesSelectDate($this);
      if(matches) {
        $this.trigger('click',true);
      } else {
        var otherInputs = $this.parent().siblings().find('a[value]');
        if(otherInputs.length==1 && !otherInputs.is('[select-date]')) {
          otherInputs.trigger('click',true);
        }
      }
    });
    $('option[select-date]').each(function(){
      var $this = $(this);
      var matches = dateMatchesSelectDate($this);
      var $parent;
      if(matches) {
        $parent = $this.parent();
        if($parent.val() != $this.val()) {
          $parent.val($this.val()).trigger('change');
        }
      } else {
        var otherInputs = $this.siblings('option');
        if(otherInputs.length==1 && !otherInputs.is('[select-date]')) {
          $parent = $this.parent();
          if($parent.val() != $this.val()) {
            $parent.val(otherInputs.val()).trigger('change');
          }
        }
      }
    });
    var isPT = dates.isPaschalTime(date);
    var showChooseDay = (date.day() !== 0);
    var rbWeekday = $('#rbWeekday').attr('value',date.day());
    if(isPT && dates.isPaschalWeek(date)) {
      showChooseDay = false;
      setPsalms(0,'no-antiphon');
      setCanticle('-po');
      $('.weekday-lbl').text('Easter ' + days[date.day()]);
    } else if(dates.isTriduum(date)) {
      showChooseDay = false;
      var day = date.day();
      setPsalms('triduum');
      var name;
      switch(day) {
        case 4:
          name = 'Maundy Thursday';
          break;
        case 5:
          name = 'Good Friday';
          break;
        case 6:
          name = 'Holy Saturday';
          break;
      }
      $('.weekday-lbl').text(name);
    } else if(calendar.dateMatches(date,'allSouls')) {
      showChooseDay = false;
      $('.weekday-lbl').text('All Souls Day');
      setPsalms('asd');
      setCanticle('-asd');
    } else {
      var psalmDay = date.day();
      if(showChooseDay && d && d.rank <= 2) {
        $('#rbSunday').trigger('click',true);
        psalmDay = 0;
      } else {
        rbWeekday.trigger('click',true);
      }
      $('.weekday-lbl').text(days[date.day()]);
      setPsalms(psalmDay, choices.season == 'paschal');
      setCanticle(isPT?'-pt':'');
    }
    $(document.body).toggleClass('hide-choose-day',!showChooseDay);
    if(d.alternates) {
      var selectFeast = $('#selectFeastDay');
      selectFeast.empty().append(d.alternates.map(function(alt,i){
        return '<option value="' + (alt.region && alt.region[0] || '') + '">'+
  alt.title+(alt.rank < 5?(' (' + formattedRank(alt.rank) + ')'): '') + (alt.region?(' ['+alt.region.join(', ')+']'):'')+
'</option>';
      }).join(''));
      var _currentRegion = "";
      var alt = d.alternates.filter(function(alt){
        return alt.region && alt.region.indexOf(region)>=0;
      });
      if(alt.length) _currentRegion = alt[0].region[0];
      selectFeast.val(_currentRegion);
    } else {
      $('#feastDay').text(d.title + (d.rank < 5?(' (' + formattedRank(d.rank) + ')'): ''));
    }
    $('#feastDay').toggle(!d.alternates);
    $('#selectFeastDay').toggle(!!d.alternates);
  };
  var setChantSrc = function($elem,src){
    if(!$elem || $elem.length === 0) return;
    $elem.attr('src',src);
    $elem.get(0).setSrc(src);
  };
  var loadChant = function(chant,value,id) {
    var src = chant + '/' + value + '.gabc';
    setChantSrc($('#'+chant),src);
    var $div = $('chant-gabc[' + id + ']');
    if($div.length > 0) {
      setChantSrc($div,$div.attr(id));
    }
    $('div.' + chant).hide();
    $('div.' + chant + '.' + value).show();
  };
  var choices = {};
  $('.btn-group .dropdown-menu>li>a[value]').click(function(e, isProgrammaticTrigger){
    e.preventDefault();
    var $this = $(this),
        $li = $this.parent(),
        $parent = $this.parents('.btn-group').first(),
        $label = $parent.find('.btn>.lbl'),
        val = $this.attr('value');
    if(isProgrammaticTrigger && $li.hasClass('selected')) return;
    $parent.removeClass('open');
    $li.parent().children().removeClass('selected');
    $li.addClass('selected');
    $label.html($this.contents().clone());
    var chant = $parent.attr('name');
    if(chant === 'weekday') {
      if(!isProgrammaticTrigger) setPsalms(parseInt(val), choices.season == 'paschal');
    } else {
      choices[chant] = val;
      if(chant=='season') {
        if(!isProgrammaticTrigger) setPsalms(undefined, val == 'paschal');
      } else {
        loadChant(chant,val,this.id);
      }
    }
  });
  $('#marian-antiphon-choices select,#marian-antiphon-solemn').change(function(){
    var $select = $('#marian-antiphon-choices select');
    var solemn = $('#marian-antiphon-solemn').prop('checked');
    var chant = 'marian-antiphon';
    var val = $select.val();
    var id = $select.find('option[value='+val+']').prop('id');
    if(solemn) {
      val += '-solemn';
      id += '-solemn';
    }
    choices[chant] = val;
    loadChant(chant, val, id);
  });
  var $date = $('#date');
  $date.change(function(){
    if(this.value) setDate(moment(this.value), localStorage.region);
  }).change();
  $('#selectFeastDay').change(function(){
    setDate(moment($date.val()), this.value);
  });
  // if ('serviceWorker' in navigator) {
  //   navigator.serviceWorker.register('./sw.js').then(function(registration) {
  //     // Registration was successful
  //     // console.log('ServiceWorker registration successful with scope: ', registration.scope);
  //   }).catch(function(err) {
  //     // registration failed :(
  //     console.log('ServiceWorker registration failed: ', err);
  //   });
  // }    
});
