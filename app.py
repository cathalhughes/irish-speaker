from flask import Flask, request, Response, render_template, flash, redirect, url_for, jsonify
from audio_processing import *
import ssl
from flask_cors import CORS
from nltk.tag import StanfordPOSTagger
from nltk.tokenize import word_tokenize
from nltk.tag import map_tag
from get_translation_google import *
import requests
import json
try:
    from BeautifulSoup import BeautifulSoup
except ImportError:
    from bs4 import BeautifulSoup


ctx = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
ctx.load_cert_chain('ssl.crt', 'ssl.key')

app = Flask(__name__)
app.secret_key = "MY_SECRET_KEY"
CORS(app, resources={r"/*": {"origins": "*"}}, send_wildcard=True)


recogniser = get_recorder()

jar = 'stanford-postagger-3.9.2.jar'
english_model = 'english-bidirectional-distsim.tagger'

java_path = "C:/Program Files/Java/jdk1.8.0_101/bin/java.exe"
os.environ['JAVAHOME'] = java_path

pos_tagger_english = StanfordPOSTagger(english_model, jar, encoding='utf8' )




@app.route('/', methods=['GET', 'POST'])
def index():


    return render_template("microphone.html")


@app.route('/predictWord', methods=['GET', 'POST'])
def speech():

    audio = request.files["audio_data"]


    audio = get_audio(audio, recogniser)
    response = recognise_audio(audio, recogniser, "en-EN")
    res_english = pos_tagger_english.tag(word_tokenize(response['transcription']))
    simplified_pos_tags_english = [(word, map_tag('en-ptb', 'universal', tag)) for word, tag in res_english]
    response['translation'] = get_translation(response['transcription'], 'ga')
    query = "+".join(response['translation'].split())
    print(query)
    getTags = requests.get("https://www.scss.tcd.ie/~uidhonne/gaeilgenxuni.cgi?mode=Part-of-Speech&text=" + query + "&submit=Go")
    html = getTags.content
    parsed_html = BeautifulSoup(html)
    taggedElements = parsed_html.body.find_all('font', attrs={'size': '2'})
    tags = {}
    #print(taggedElements)
    tagsOnly = []
    for tag in taggedElements:
        if "+" in tag.text and "\n" not in tag.text:
            text = tag.text.split("+")
            if text[0] not in tags:
                if text[1] == "Subst":
                    tags[text[0]] = text[2]
                    tagsOnly.append(text[2])
                else:
                    tags[text[0]] = text[1]
                    tagsOnly.append(text[1])

    taggedTranslatedPhrase = []
    for word, tag in zip(response['translation'].split(), tagsOnly):
        taggedTranslatedPhrase.append(word + "_" + tag.upper())



    taggedPhrase = ['_'.join(str(i) for i in tup) for tup in simplified_pos_tags_english]

    taggedPhrase.append("NEWLINE")
    taggedPhrase = taggedPhrase + taggedTranslatedPhrase

    print(taggedPhrase)
    data = {"taggedText": taggedPhrase,
            "audioQuery": "%20".join(query.split("+"))}
    return jsonify(data)






app.run(host='localhost', port=5000, ssl_context=ctx ,threaded=True, debug=True)