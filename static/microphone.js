//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream; 						//stream from getUserMedia()
var rec; 							//Recorder.js object
var input; 							//MediaStreamAudioSourceNode we'll be recording
var transcription;
var recording =  false;

// shim for AudioContext when it's not avb.
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext //audio context to help us record


var microphoneButton = document.getElementById("js-microphone");

//add events to those 2 buttons
microphoneButton.addEventListener("click", toggleRecording);
//microphoneButton.addEventListener("touchend", stopRecording);

var constraints = { audio: true, video:false }

function toggleRecording()
	{
	    console.log("here");
		recording ? stopRecording() : startRecording();
	}

function startRecording() {
	console.log("recordButton clicked");

    recording = true;
	/*
		Simple constraints object, for more advanced audio features see
		https://addpipe.com/blog/audio-constraints-getusermedia/
	*/

    var constraints = { audio: true, video:false }

	/*
    	We're using the standard promise based getUserMedia()
    	https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
	*/

	navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
		console.log("getUserMedia() success, stream created, initializing Recorder.js ...");
		//$(microphoneButton).attr('class', '');
		$(microphoneButton).attr('class', 'js-microphone button button--microphone button--microphone-active');
    //$(microphoneButton).addClass("button--microphone-active");

		/*
			create an audio context after getUserMedia is called
			sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
			the sampleRate defaults to the one set in your OS for your playback device
		*/
		audioContext = new AudioContext();

		//update the format
		var formats = "Format: 1 channel pcm @ "+audioContext.sampleRate/1000+"kHz"

		/*  assign to gumStream for later use  */
		gumStream = stream;

		/* use the stream */
		input = audioContext.createMediaStreamSource(stream);

		/*
			Create the Recorder object and configure to record mono sound (1 channel)
			Recording 2 channels  will double the file size
		*/
		rec = new Recorder(input,{numChannels:1})

		//start the recording process
		rec.record()

		console.log("Recording started");

	}).catch(function(err) {
	  	recordingTrouble();
	});
}

function stopRecording() {
	console.log("stopButton clicked");
	recording = false;
  $(microphoneButton).removeClass("button--microphone-active");

	//tell the recorder to stop the recording
	rec.stop();

	//stop microphone access
	gumStream.getAudioTracks()[0].stop();

	//create the wav blob and pass it on to createDownloadLink
	rec.exportWAV(createDownloadLink);
}

function createDownloadLink(blob) {

	var url = URL.createObjectURL(blob);


	//name of .wav file to use during upload and download (without extendion)
	var filename = new Date().toISOString();

	//upload link
  var xhr=new XMLHttpRequest();
  xhr.onload=function(e) {
    if(this.readyState === 4) {
      console.log("Server returned: ", e.target.responseText);
      if(e.target.status >= 300) {
        recordingTrouble();
      } else {
        document.getElementById("loading").innerHTML = '';
        $("#js-microphone").attr("disabled", false);
        $("#submit").attr("disabled", false);
        recordingSuccess();
        var json = JSON.parse(e.target.response);

        callback(json);
      }
    }
  };
  var fd=new FormData();
  fd.append("audio_data", blob, filename);
  document.getElementById("loading").innerHTML = '<img src="static/loading.gif" />';
  $("#js-microphone").attr("disabled", true);
  $("#submit").attr("disabled", true);
  xhr.open("POST","/speech",true);
  xhr.send(fd);
}

function recordingTrouble() {
  $(".js-microphone").addClass("button--microphone-recording-failure");
  $(".js-microphone").animateCss("shake", function() {
    $(".js-microphone").removeClass("button--microphone-recording-failure");
  });
}

function recordingSuccess() {
  $(".js-microphone").addClass("button--microphone-recording-success");
  $(".js-microphone").animateCss("shake", function() {
    $(".js-microphone").removeClass("button--microphone-recording-success");
  });
}

$.fn.extend({
  animateCss: function(animationName, callback) {
    var animationEnd = (function(el) {
      var animations = {
        animation: 'animationend',
        OAnimation: 'oAnimationEnd',
        MozAnimation: 'mozAnimationEnd',
        WebkitAnimation: 'webkitAnimationEnd',
      };

      for (var t in animations) {
        if (el.style[t] !== undefined) {
          return animations[t];
        }
      }
    })(document.createElement('div'));

    this.addClass('animated ' + animationName).one(animationEnd, function() {
      $(this).removeClass('animated ' + animationName);

      if (typeof callback === 'function') callback();
    });

    return this;
  },
});

// default options
var options = {
    'text': 'Franz jagt im komplett verwahrlosten Taxi quer durch Bayern.'
}


// initialize page (bind events etc.)
function init() {
    $('#tagTipContainer').hide();

    $('#submit').bind('click', tag);
    $('#edit').bind('click', edit);
    $(window).bind('resize', function() { $('#tagTipContainer').hide(); });
    $('#tagTipContainer').bind('click', function() { $('#tagTipContainer').hide(); });

}

// Start editing
function edit() {
    $('#text').text(transcription)
    $('#form').removeClass('mode-view').addClass('mode-edit');
    $('#tagTipContainer').hide();
}


// Start tagging
function tag() {
    $('#spinner').show();
    var text = $('#text').val();
    if(text === '') {
        $('#text').css('border-color', '#ff4c4c');

        // Add a class that defines an animation
        $('#text').addClass('error');

        // remove the class after the animation completes
        setTimeout(function() {
           $('#text').removeClass('error');
        }, 300);

        e.preventDefault();
    } else {
         $('#text').css('border-color', '#fffff');
    }
    text = text.replace('»', '"');
    text = text.replace('«', '"');

    // No proxy when developing (.*local.* in host)
    var url = "/text"
    $.ajax({
        url: url,
        type: "POST",
        data: {"phrase": text},
        beforeSend: function() {
         document.getElementById("loading").innerHTML = '<img src="static/loading.gif" />';
         $("#js-microphone").attr("disabled", true);
         $("#submit").attr("disabled", true);
         },
        success: function(data) {
            document.getElementById("loading").innerHTML = '';
            $("#js-microphone").attr("disabled", false);
            $("#submit").attr("disabled", false);
            callback(data);
        }

    });
    return false;
}

// Tagging finished - process response
function callback(data) {

    var tagMap = appData.tagMap;
    var color = appData.colors;
    transcription = data.transcription;

    $('#form').removeClass('mode-edit').addClass('mode-view');
    $('#tagTipContainer').hide();
    var audioQuery = data.audioQuery;
    $('#audio').attr('onclick', "new Audio('https://www.abair.tcd.ie/api/?input=" + audioQuery + "&format=mp3&synth=ga_CO').play()")
    var words = data.taggedText;
    var taggedHTML = "";
    var lastWord = "";
    $.each(words, function(index, taggedWord) {
        var tag = taggedWord.substring(taggedWord.lastIndexOf("_") + 1);
        var word = taggedWord.substring(0, taggedWord.lastIndexOf("_"));
        word = word.replace("\\/", "/");
        word = word.replace("-LRB-", "(");
        word = word.replace("-RRB-", ")");
        // TODO: are there other symbols?
        if (tag != '$,' && tag != '$.' && lastWord != '``' && word != '\'\'' && word != ')' && lastWord != '(') {
            taggedHTML += ' ';
        }
        lastWord = word;
        word = word.replace('``', '"');
        word = word.replace('\'\'', '"');
        if (word == '"') {
            tag = '';
        }
	// TODO: escape html
        if (tagMap[tag] != undefined && color[tagMap[tag][0]] != undefined) {
            taggedHTML += '<span class="taggedWord" style="background-color: ' + color[tagMap[tag][0]] + '">' + word + '<span>' + tag + '</span></span>';
        }
        else if(tag === "NEWLINE") {
            taggedHTML += '<br/>';
        }
        else {
            taggedHTML += '<span class="taggedWord">' + word + '<span>' + tag + '</span></span>';
        }
    });
    $('#textTagged').html(taggedHTML);

    $('.taggedWord').bind('click mouseover', function(ev) {
        var word = $(ev.target);
        var tagName = word.find('span').first().html();
        if (tagName == "" || tagMap[tagName] == undefined) {
            return; // cancel if tag not defined
        }
        $('#tagTipContainer').show();
        if (tagMap[tagName][0] != "" ) {
	    // TODO: translate
	    var infoHtml = '<b>' + tagMap[tagName][0] + '</b>, ' + tagName;
	    if (tagMap[tagName][1] != '') {
	        infoHtml += '<br />(' + tagMap[tagName][1] + ')';
	    }
	    if (tagMap[tagName][2] != '') {
	        infoHtml += "<br />" + appData.clientStrings['label_examples'] + " " + tagMap[tagName][2];
            }
            $('#tagTip').html(infoHtml);
        }
        else {
            $('#tagTip').html(tagName + ': ' + tagMap[tagName][1]);
        }
        $('#tagTipContainer').css('background-color', color[tagMap[tagName][0]] != undefined ? color[tagMap[tagName][0]] : '#fff');
        $('#tagTipContainer').offset({'left': word.offset().left});
        $('#tagTipContainer').offset({'top': word.offset().top + word.outerHeight()});
        $('#tagTipContainer .up').offset({'left': word.offset().left + word.outerWidth() / 2 - $('#tagTipContainer .up').outerWidth() / 2});
    });
    $('.taggedWord').bind('mouseout', function(ev) {
        $('#tagTipContainer').hide();
    });

}

function showTags() {
    $('.taggedWord span').show();
}

function hideTags() {
    $('.taggedWord span').hide();
}

function refreshHref() {
    document.location.href = "#" + $.toJSON(options);
}

$(window).on('load', init);