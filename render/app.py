import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from google.genai import types
from PIL import Image
import requests
import time
from io import BytesIO


# 1. Initialize the Flask app
app = Flask(__name__)

CORS(app)


client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
config = types.GenerateContentConfig(system_instruction="You are a Malawian Genius Youths[MGY] AI. Your name is GIC.")

def getFile(url):
    try:
        file = requests.get(url)
        if file.status_code == 200:
            return BytesIO(file.content)
    except Exception as e:
        return False

@app.route('/ask', methods=['POST'])
def ask_gemini():
    if request.method == 'OPTIONS':
        return '', 204
    try:
        # Get the JSON data sent from your Netlify frontend
        data = request.json
        user_message = data.get("message", "Hello")
        model = data.get("model", "gemini-2.5-flash-lite")
        user_message = data.get("message", "Hello")
        img = data.get("img_url", False)
        contents = [user_message]
        list = []
        def generate():
            response = client.models.generate_content_stream(
                    model = model, 
                    contents = contents,
                    config = config
                )
            
            for chunk in response:
                if chunk.text:
                    list.append(chunk.text)

        if img:
            file = getFile(img)
            if not file:
                return jsonify({
                    "status": "error",
                    "message": img+' Not found.'
                }), 500
            img = Image.open(file)
            contents.insert(0,img)
    
        
        generate()
        
        return jsonify({
            "status": "success",
            "reply": list
        })

    except Exception as e:
        # If something breaks, Render will show this in the "Logs"
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/upload', methods=['POST'])
def file_store_upload():
    try:
        file = request.files.get('file')
        file_search_store = client.file_search_stores.create(config={'display_name':'MGY files'})
        operation = client.file_search_stores.upload_to_file_search_store(
                    file=file,
                    file_search_store_name = file_search_store.name,
                    config = {'display_name':'MGY files'})
    
        while not operation.done:
            time.sleep(5)
            operation = client.operations(operation)
        return jsonify({
                "status": "success",
                "reply": 'file uploaded'
            })
    except Exception as e:
        # If something breaks, Render will show this in the "Logs"
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    
# 4. The Entry Point
# Render uses a "Port" to listen for requests
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
