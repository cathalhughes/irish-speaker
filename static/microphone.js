//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream; 						//stream from getUserMedia()
var rec; 							//Recorder.js object
var input; 							//MediaStreamAudioSourceNode we'll be recording

// shim for AudioContext when it's not avb.
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext //audio context to help us record


var microphoneButton = document.getElementById("js-microphone");

//add events to those 2 buttons
microphoneButton.addEventListener("mousedown", startRecording);
microphoneButton.addEventListener("mouseup", stopRecording);

var constraints = { audio: true, video:false }

function startRecording() {
	console.log("recordButton clicked");

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
    $(microphoneButton).addClass("button--microphone-active");

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
        recordingSuccess();
      }
    }
  };
  var fd=new FormData();
  fd.append("audio_data", blob, filename);
  xhr.open("POST","/predictWord",true);
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