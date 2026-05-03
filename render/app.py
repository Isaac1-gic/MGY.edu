import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from google import genai
from google.genai import types
from PIL import Image
import markdown2
import requests
from pydantic import BaseModel, Field
from typing import List
import time
from io import BytesIO
import json, time
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
SOURCES OF UPDATES:
    'https://www.education.gov.mw/',
     'https://www.google.com/search?q=https://www.gov.mw/',
     'https://www.google.com/search?q=https://www.maneb.edu.mw/',
     'https://www.nche.ac.mw/',
     'https://www.mubas.ac.mw/',
     'https://www.unima.ac.mw/',
     'http://www.luanar.ac.mw/',
     'https://www.mzuni.ac.mw/',
     'https://www.google.com/search?q=https://times.mw/category/education/',
     'https://www.google.com/search?q=https://mwnation.com/category/national/education/',
     'https://www.google.com/search?q=https://www.maravipost.com/education/'
 
INPUT HANDLING:
- You will be provided with raw text.


Ignore advertisements, and old news (anything older than 150 days unless it is a major announcement and do not remake same post unless you will bring new things on same title).
No matter what do not return None. Do everthing as educational news maker not like AI If no important updates are found, return an empty list.
Note: if you break structure/formart of output It will cause error which will keep system just looping requests to you.

TONE: 
Professional, empowering, and clear. Avoid "fluff" words. """


class MatchResult(BaseModel):
    # Field Name : Type = Field(description="...")
    title: str = Field(description="Short, catchy headline")
    post: str = Field(description="""The 'post' field must strictly follow this Markdown structure:
            
            # 📌 [CATCHY HEADLINE]
            ---
            **What’s Happening:** [Clear, 1-2 sentence summary of the news.]
            
            **Why It Matters for Geniuses:** [Explain the impact on MGY users/students.]
            
            **🚀 Action Steps:**
            * 📅 **Deadline:** [Date]
            * 📝 **Requirement:** [What to bring/do]
            * 🔗 **Link:** [Text](URL)
            
            ---
            _Source: [Name of Institution]_""")
    category: str = Field(description="Exams | Selection | Policy | Scholarship | etc")
    imageUrl: str = Field(description="The exact URL where to find image to present on this update")
    urgency: str = Field(description="High | Medium | Low")
    source: str = Field(description="Exactly Which url from given list of sources above you get this update")

config = types.GenerateContentConfig(
            tools=[
                    grounding_search,
                    {"url_context": {}}
                ],
            #response_mime_type = "application/json",
            #response_json_schema = MatchResult.model_json_schema(),
            system_instruction="You are a Malawian Genius Youths[MGY] AI. Your name is GIC. More infor about you on https://mgy.web.app/index.html. "+commands
    )

extract_config = types.GenerateContentConfig(
    response_mime_type="application/json",
    response_json_schema=MatchResult.model_json_schema(),
    system_instruction="You are a JSON formatter. Turn the provided news summary into a valid JSON object matching the MatchResult schema. " + commands
)

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
        is_valid = True#(user_data == password)
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
        model = data.get("model", "gemini-2.5-flash-pro")
        img = data.get("img_url", False)
        contents = [user_message]
        list = []
        text = ''
        def chatAi():
            firebase_init()
            # 1. Get history from Firebase
            ref = db.reference('history')
            history_data = ref.get()
            post_ref = db.reference('post')
            app_updates = db.reference("mgyPosts")
            old_post = post_ref.get()
            # Ensure history is a list for the SDK
            if not history_data:
                history_data = []
        
            # 2. Create the chat session
            chat = client.chats.create(
                model=model,
                history=history_data, # Firebase dicts work directly here
                config=config
            )
        
            # 3. Send the message
            response = chat.send_message(user_message + '. These are already posted old posts' +json.dumps(old_post))
            time.sleep(3)
            extract_chat = client.chats.create(model=model, config=extract_config)
            final_response = extract_chat.send_message(f"Format this news into JSON: {response.text}")
            json_data = json.loads(final_response.text)
            print(type(json_data),json_data)
            return output(json_data,extract_chat)

        def parse_mgy_json(text,chat):
            try:
                clean_text = text.replace("```json", "").replace("```", "").strip()
                data = json.loads(clean_text)
                return data['updates']
            except Exception as e:
                print(f"Failed to parse JSON: {e}")
                time.sleep(3)
                resp = chat.send_message("Oooosh! you haven`t follow output system instructions which has result in code errors. Please read back with care and bring correct format and structure.")
                reply_text = resp.text
                return output(reply_text,chat)
            
        def output(reply_text,chat):
            print(type(reply_text))
            print(reply_text)
            obj = reply_text #parse_mgy_json(reply_text,chat)
            if obj:
                post = obj
                print(type(old_post))
                lastMsg = list(old_post.items())[-1]
                mgyPostFormat = {
                    'imageUrl':post['imageUrl'],
                    'prompt': post['post'],
                    'title': post['title'],
                    'imgUrl': 'img/mgy.jpg',
                    'senderId': 'MGY',
                    'userkey': 'mgy',
                    'types': ['imageMsg','textMsg'],
                    'chatId': int(time.time())*1000,
                    "category": post["category"],
                    "urgency": post["urgency"],
                    "source": post["source"],
                    "previous_chatId": lastMsg[0],
                    "previous_title": lastMsg[1]["title"]
                }
                post_ref.push(mgyPostFormat)
                app_updates.push(mgyPostFormat)
                return obj
        
            return reply_text
          
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
    
        
        
        
        return jsonify({
            "status": "success",
            "reply": chatAi()#list
        })

    except Exception as e:
        # If something breaks, Render will show this in the "Logs"
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/update/<id>')
def show_update(id):
    firebase_init()
    if not id:
        raise Exception('Post not found')
    if id == 'home':
        post_ref = db.reference('post')
        updates = post_ref.get()
        update = list(updates.values())[-1]
    else:
        post_ref = db.reference('post/'+id)
        update = post_ref.get()
        print(update)
    html_content = markdown2.markdown(update['prompt'], extras=["fenced-code-blocks", "tables"])
    update['post'] = html_content
    return render_template('updates.html', update = update)
    
@app.route('/robots.txt')
def robots():
    return "User-agent: *\nAllow: /"
    
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
