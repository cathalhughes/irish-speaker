from flask import Flask, request, Response, render_template, flash, redirect, url_for, jsonify
from audio_processing import *
import ssl
from flask_cors import CORS
from get_translation_google import *


ctx = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
ctx.load_cert_chain('ssl.crt', 'ssl.key')

app = Flask(__name__)
app.secret_key = "MY_SECRET_KEY"
CORS(app, resources={r"/*": {"origins": "*"}}, send_wildcard=True)


recogniser = get_recorder()


@app.route('/', methods=['GET', 'POST'])
def index():


    return render_template("microphone.html")


@app.route('/predictWord', methods=['GET', 'POST'])
def predictWord():

    audio = request.files["audio_data"]


    audio = get_audio(audio, recogniser)
    response = recognise_audio(audio, recogniser, "en-EN")

    response['translation'] = get_translation(response['transcription'], 'ga')
    print(response)
    return jsonify(response)






app.run(host='localhost', port=5000, ssl_context=ctx ,threaded=True, debug=True)