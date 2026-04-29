import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from google.genai import types
from PIL import Image
import requests
import time
from io import BytesIO
import json
import firebase_admin
from firebase_admin import auth, credentials, db


# 1. Initialize the Flask app
app = Flask(__name__)

CORS(app, origins=[
    "https://mgy265.netlify.app/",
    "https://mgy265.netlify.app",
    'https://isaac1-gic.github.io',
    "https://mgy.web.app"
])


client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
grounding_search = types.Tool(google_search=types.GoogleSearch())
commands = """ROLE: You are the MGY Intelligence Unit, a specialized educational analyst for the "Malawian Genius Youth" (MGY) platform. 

OBJECTIVE: Your task is to analyze scraped text from Malawian educational websites and extract only high-impact, actionable updates for students.

CRITERIA FOR "IMPORTANT" UPDATES:
1. URGENCY: Deadlines for MSCE/JCE registration, University application closing dates, or immediate school calendar changes.
2. IMPACT: National exam results releases (MANEB), University selection lists (NCHE), or major scholarship opportunities.
3. ACTIONABLE: Any update that requires a student to "do" something (e.g., "Download this form," "Check this list").

INPUT HANDLING:
- You will be provided with raw text with educational url sites.
- Ignore navigation bars, footers, advertisements, and old news (anything older than 48 hours unless it is a major announcement).

OUTPUT FORMAT (STRICT JSON):
You must return a list of only 1 very important update in the following JSON format so it can be pushed directly to Firebase:
{
  "updates": [
    {
      "post": "title-> Short, catchy headline. body-> explanation of why this is important and matters to an MGY user. action_text -> e.g., Apply Now, Check Results, or Save Date. Include clickable text -> eg [https://example.com](Example) in short use markdowm format",
      "category": "Exams | Selection | Policy | Scholarship | etc",
      "imgUrl": "The exact URL where to find image to present on this update",
      "urgency": "High | Medium | Low"
      
    }
  ]
}

TONE: 
Professional, empowering, and clear. Avoid "fluff" words. Do everthing as educational news maker not like AI If no important updates are found, return an empty list."""
config = types.GenerateContentConfig(tools=[grounding_search,{"url_context": {}}], system_instruction="You are a Malawian Genius Youths[MGY] AI. Your name is GIC. More infor about you on https://mgy.web.app/index.html. "+commands)


def firebase_init():
    if not firebase_admin._apps:
        config_json = os.getenv("FIREBASE_CONFIG")
        if config_json:
            cred_dict = json.loads(config_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred, {
                'databaseURL': "https://msce-g-studies-tracker-baa6f-default-rtdb.europe-west1.firebasedatabase.app"
            })

@app.route('/login', methods=['POST'])
def login():
    firebase_init()
    data = request.json
    username = data.get('username')
    password = data.get('password')
    notnew = data.get('notnew',False)

    if not username or not password:
        return jsonify({"error": "Missing username or password"}), 400
        
    mapping = { 
        ".": "mgyDOT",
        "#": "mgyHASH",
        "$": "mgyCASH",
        "[": "mgyOBR",
        "]": "mgyCBR"
    }
    
    table = str.maketrans(mapping)
    sanitized_uid = username.translate(table)
    uid = f"user_{sanitized_uid[::-1]}" 
    
    # 1. Access the database reference
    ref = db.reference('lock/' + uid)
    user_data = ref.get() # Fetch the actual data at this path

    # 2. FIXED LOGIC: 'if ref:' is always true. You must check 'user_data'.
    if notnew:
        # Check if password matches for existing user
        is_valid = (user_data == password)
    else:
        # For new users, only set password if the spot is empty
        ref.set(password)
        is_valid = True
        """if user_data is None:
            ref.set(password)
            is_valid = True
        else:
            return jsonify({"error": "Username already taken"}), 400"""

    if is_valid:
        try:
            # 3. Create a unique UID for this user
           
            # 4. Generate the Custom Token
            custom_token = auth.create_custom_token(uid)
            
            token_str = custom_token.decode('utf-8') if isinstance(custom_token, bytes) else custom_token
            
            return jsonify({"token": token_str}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        return jsonify({"error": "Invalid credentials"}), 401
        
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
        img = data.get("img_url", False)
        contents = [user_message]
        list = []
        text = ''
        def chatAi():
            firebase_init()
            global text
            ref = db.reference('history')
            history = ref.get() 
            if history:
                data = history
            else:
                data = []
            chat = client.chats.create(
                                       model=model,
                                       history=data,
                                       config = config
                                       )
            response = chat.send_message(user_message)

            ref.set(chat.get_history())
            text = response.text
            
        def generate():
            response = client.models.generate_content_stream(
                    model = model, 
                    contents = contents,
                    config = config
                )
            
            for chunk in response:
                if chunk.text:
                    list.append(chunk.text)
                    text += chunk.text

        if img:
            file = getFile(img)
            if not file:
                return jsonify({
                    "status": "error",
                    "message": img+' Not found.'
                }), 500
            img = Image.open(file)
            contents.insert(0,img)
    
        
        chatAi()
        
        return jsonify({
            "status": "success",
            "reply": text#list
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
        data = request.json
        file_name = data.get('name',False)
        url = data.get('url',False)
        if not file_name:
            return jsonify({"status": "error", "message": "No file uploaded"}), 400

        # 1. Read the file into a BytesIO object
        # This makes the data look like a 'real' file to the SDK
        file_content = getFile(url)
        
        # 2. Create the store
        file_search_store = client.file_search_stores.create(
            config={'display_name': 'MGY Library'}
        )

        # 3. FIX: Pass the BytesIO object and the original filename
        # The SDK uses the extension (.pdf) to know how to parse it
        operation = client.file_search_stores.upload_to_file_search_store(
            file=file_content,
            file_search_store_name=file_search_store.name,
            config={
                'display_name': filename,
            }
        )

        # 4. Correct Polling Logic
        while not operation.done:
            time.sleep(2)
            # Use operation.name to refresh the status
            operation = client.operations.get(name=operation.name)

        return jsonify({
            "status": "success",
            "reply": "file uploaded successfully",
            "store_name": file_search_store.name
        })

    except Exception as e:
        # We print to the Render logs so you can see the full error, 
        # but send a clean message to the frontend.
        print(f"Upload Error: {str(e)}") 
        return jsonify({
            "status": "error", 
            "message": "Upload failed. Check server logs."
        }), 500   
# 4. The Entry Point
# Render uses a "Port" to listen for requests
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
