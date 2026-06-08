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
from io import BytesIO
import json, time, traceback
import firebase_admin
from firebase_admin import auth, credentials, db


# 1. Initialize the Flask app
app = Flask(__name__)

CORS(app, origins=[
    "https://mgy265.netlify.app",
    'https://isaac1-gic.github.io',
    "https://mgy.web.app"
])


client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
grounding_search = types.Tool(google_search=types.GoogleSearch())
commands = """
ROLE:
You are the MGY Intelligence Unit, a specialized educational analyst for the "Malawian Genius Youth" (MGY) platform.

OBJECTIVE:
Search updates from Malawian educational websites and extract ONLY high-impact, actionable educational updates relevant to students.

IMPORTANT UPDATE TYPES:
1. MANEB announcements
2. University selection/admission lists
3. Scholarship opportunities
4. Application deadlines
5. Exam registration dates
6. School calendar changes
7. NCHE announcements
8. Student opportunities
9. Academic policy changes
10. Internship or training opportunities for students

SOURCE News:
### Government & Education Authorities
* education.gov.mw
* maneb.edu.mw
* nche.ac.mw
* gov.mw
* malawi.gov.mw

### Universities

* unima.ac.mw
* mubas.ac.mw
* luanar.ac.mw
* mzuni.ac.mw
* must.ac.mw
* cu.ac.mw
* catholicuniversity.mw
* malawiadventistuniversity.ac.mw

### Technical & Vocational

* teveta.org.mw

### Malawi Education News

* times.mw/category/education/
* mwnation.com/category/education/
* maravipost.com/category/education/
* nyasatimes.com
* malawi24.com
* faceofmalawi.com

### Scholarships & Opportunities

* mastercardfoundation.org
* commonwealthscholarships.org
* chevening.org
* daad.de
* fulbrightonline.org
* britishcouncil.org
* opportunitiesforafricans.com
* opportunitydesk.org
* youthop.com
* afterschoolafrica.com

### International Education

* unesco.org
* unicef.org
* worldbank.org/en/topic/education
* globalpartnership.org

### Facebook Pages

* Ministry of Education Malawi
* MANEB
* NCHE Malawi
* University of Malawi
* MUBAS
* LUANAR
* Mzuzu University
* MUST
* Catholic University of Malawi
* TEVETA Malawi
* British Council Malawi
* US Embassy Malawi
* EU in Malawi
* Mastercard Foundation
* Malawi Universities Students Association (MUSA)
* University student unions and associations

### Additional High-Value Sources

* University notice boards
* University admissions portals
* University registrar announcements
* Scholarship announcements
* Internship announcements
* STEM competitions
* Science fairs
* Robotics competitions
* Coding competitions
* Essay competitions
* Debate competitions
* Research grants
* Innovation challenges
* Hackathons
* Student exchange programs
* Fellowship programs
* Graduate trainee programs
* Government bursary announcements
* NGO education programs
* Education-related press releases
* Official institution social media accounts (Facebook, X, LinkedIn, YouTube)


FILTERING RULES:
- Ignore advertisements
- Ignore unrelated politics
- Ignore sports unless educational
- Ignore duplicate old news
- Prefer updates newer than 7 days
- If same story exists, only post if there is NEW VERY IMPORTANT information
- Ignore broken website 

CONTENT RULES:
- Think like a professional educational news editor
- Write naturally like MGY staff, NOT like AI
- Focus on clarity and usefulness
- Make posts engaging for students
- Prioritize updates requiring action from students

VERY IMPORTANT:
- NEVER return None
- NEVER return invalid JSON
- NEVER break the JSON structure
- NEVER include explanations outside JSON
- ALWAYS return a valid JSON object

IF NO IMPORTANT UPDATE EXISTS:
Return EXACTLY:

{
  "updates": []
}

OUTPUT FORMAT:
{
  "updates": [
    {
      "title": "Short catchy educational headline",

      "post": "# 📌 [CATCHY HEADLINE]\n\n---\n[Clear, 1-2 sentence summary of the news.]\n\n[Explain the news and its impact on  users/students.]\n\n[ActionSteps. include this paragraph if needed]\n[Date . include this paragraph if needed]\n[Requirement/What to bring/do. include this paragraph if needed]\n* 🔗 **Link:** [Text](URL to get more information.)\n\n---\n_Source: [Name of Institution]_",

      "category": "Exams | Admissions | Scholarship | Policy | Opportunity | Selection",

      "imageUrl": "Direct related image URL if available otherwise return '/img/mwflag.png'",

      "urgency": "High | Medium | Low",

      "source": "Original source URL"
    }
  ]
}

FALLBACK CONTENT MODE:
If NO important educational update is found, you must automatically switch into "MGY Knowledge Mode".

In MGY Knowledge Mode:
- Create ONE highly interesting educational post instead of returning empty updates
- The post must teach something surprising, useful, scientific, technological, psychological, historical, or academic that most students do NOT know
- Focus on "hidden knowledge", "behind the science", "how things really work", "smart learning tricks", "future technology", "AI", "human brain", "space", "physics", "cybersecurity", "medicine", "engineering", or "education secrets"
- The content MUST still feel educational and valuable to MGY students
- The post must NOT feel random or like entertainment gossip
- Make the reader feel smarter after reading it
- Prefer topics that can improve thinking, studying, creativity, discipline, or future career awareness

MGY Knowledge Mode RULES:
- The content must be factual
- The content must be easy to understand
- Avoid overly complex scientific jargon
- Make the headline extremely catchy
- Use curiosity-driven storytelling
- Include real-world usefulness
- Avoid fake science or myths
- Avoid repeating recently generated knowledge posts
- The content should feel like "something schools rarely teach"

FOR MGY KNOWLEDGE MODE:
Use the SAME JSON structure and SAME markdown structure.

Additional category options:
"Science | Technology | Brain | Psychology | AI | Space | Cybersecurity | Study Secrets | Engineering | Future Careers"

For MGY Knowledge Mode:
- urgency should usually be "Medium"
- source can be "MGY Knowledge Unit"
- imageUrl can use '/img/mwflag.png' if no relevant image exists

EXAMPLES OF GOOD MGY KNOWLEDGE MODE TOPICS:
- Why humans forget 80% of what they study in 24 hours
- The science behind procrastination
- How AI actually predicts words
- Why airplane mode still drains battery
- How hackers guess weak passwords
- Why the brain learns better during sleep
- The hidden psychology behind social media addiction
- Why coding changes problem-solving ability
- The mathematics secretly used in TikTok algorithms
- Why students remember stories more than notes
- How Google search actually works
- Why some people learn faster than others
- The science behind memory techniques used by champions

IMPORTANT:
- ONLY activate MGY Knowledge Mode when NO important educational update exists
- If real educational news exists, ALWAYS prioritize the real update first

POSTING RULES:
- Return ONLY 1 best update
- The update must be meaningful to students
- If multiple updates exist, choose the MOST impactful one
- Do not invent information
- Do not create fake deadlines
- Keep formatting clean Markdown-compatible

TONE:
Professional, empowering, clear, student-focused.
"""


class MatchResult(BaseModel):
    # Field Name : Type = Field(description="...")
    title: str = Field(description="Short, catchy headline")
    post: str = Field(description="""The 'post' field must strictly follow this Markdown structure:
            
            # 📌 [CATCHY HEADLINE]
            ---
            [Clear, 1-2 sentence summary of the news.]
            
            [Explain the news and its impact on  users/students.]
            
            [ActionSteps. include this paragraph if needed]
            [Date . include this paragraph if needed]
            [Requirement/What to bring/do. include this paragraph if needed]
            * 🔗 **Link:** [Text](URL to get more information.)
            
            ---
            _Source: [Name of Institution]_""")
    category: str = Field(description="Exams | Selection | Policy | Scholarship | etc")
    imageUrl: str = Field(description="The exact URL where to find image to present on this update")
    urgency: str = Field(description="High | Medium | Low")
    source: str = Field(description="Exactly Which url from given list of sources above you get this update")


class LessonStructure(BaseModel):
    # Field Name : Type = Field(description="...")
    title: str = Field(description="Short, catchy headline")
    post: str = Field(description="""The 'post' field must strictly follow this Markdown structure:
            
            # 📌 [CATCHY HEADLINE]
            ---
            **Objective:** [Clear, summary of the lesson. What will the student achieve]
        
            **Why:** [The university relevance.]

            **Lesson:** [The step-by-step walkthrough.]
            
            **Practice Challenge:** [A small task for the student to complete.]
            
            * 🔗 **Link:** 
                [submit answer](https://wa.me/265980617390)
            
            ---
            _Source: [MGY]_""")



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
    system_instruction="You are a JSON formatter. Turn the provided news summary into a valid JSON object matching the MatchResult schema. If no important info in text, return an string -> 'MGY'." 
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
    firebase_init()
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
            print("--- FULL ERROR START ---")
            traceback.print_exc()
            print("--- FULL ERROR END ---")
            return jsonify({"error": str(e)}), 500
    else:
        return jsonify({"error": "Invalid credentials"}), 401
        
def getFile(url):
    try:
        file = requests.get(url)
        if file.status_code == 200:
            return {'bytes': BytesIO(file.content), 'content_type': file.headers['Content-Type'].split(';')[0]}
    except Exception as e:
        print("--- FULL ERROR START ---")
        traceback.print_exc()      
        print("--- FULL ERROR END ---")
        return False

@app.route('/lessons', methods=['POST'])
def microsoft_office_lessons():
    if request.method == 'OPTIONS':
        return '', 204

    ms_office_course = [

        # =========================
        # MICROSOFT WORD
        # =========================
    
        {
            "module": "Introduction to MS Word",
            "topics": "What is Word, interface, ribbon, toolbar, opening and saving documents",
            "activity": "Create and save first document",
            "objective": "Understand the Microsoft Word environment and basic document operations",
            "youtubeVideo": "j-ZAVHk5SaU"
        },
    
        {
            "module": "Typing and Editing Text",
            "topics": "Cursor movement, selecting text, cut, copy, paste",
            "activity": "Type a school letter",
            "objective": "Learn how to enter and edit text efficiently",
            "youtubeVideo": "Uriqg5T8Uzo"
        },
    
        {
            "module": "Font Formatting",
            "topics": "Font style, size, color, bold, italic, underline",
            "activity": "Format a notice",
            "objective": "Apply text formatting techniques",
            "youtubeVideo": "Uriqg5T8Uzo"
        },
    
        {
            "module": "Paragraph Formatting",
            "topics": "Alignment, indentation, line spacing",
            "activity": "Format an essay",
            "objective": "Format paragraphs professionally",
            "youtubeVideo": "Uriqg5T8Uzo"
        },
    
        {
            "module": "Bullets and Numbering",
            "topics": "Lists and multilevel lists",
            "activity": "Create class rules list",
            "objective": "Organize information using lists",
            "youtubeVideo": "Uriqg5T8Uzo"
        },
    
        {
            "module": "Page Layout",
            "topics": "Margins, orientation, paper size, columns",
            "activity": "Design newsletter layout",
            "objective": "Customize document page setup",
            "youtubeVideo": "YJjYHRIiDzQ"
        },
    
        {
            "module": "Insert Features",
            "topics": "Shapes, icons, symbols, text boxes",
            "activity": "Create invitation card",
            "objective": "Insert and manipulate objects in Word",
            "youtubeVideo": "0Y5ai_u5etI"
        },
    
        {
            "module": "Tables in Word",
            "topics": "Create tables, merge and split cells",
            "activity": "Make student marks table",
            "objective": "Present structured data using tables",
            "youtubeVideo": "0Y5ai_u5etI"
        },
    
        {
            "module": "Images and WordArt",
            "topics": "Insert images, WordArt, captions",
            "activity": "Design event poster",
            "objective": "Enhance documents visually",
            "youtubeVideo": "0Y5ai_u5etI"
        },
    
        {
            "module": "Headers and Footers",
            "topics": "Page numbers, date and time, headers",
            "activity": "Create report pages",
            "objective": "Add navigation and identification elements",
            "youtubeVideo": "0Y5ai_u5etI"
        },
    
        {
            "module": "References Tools",
            "topics": "Table of contents, citations, footnotes",
            "activity": "Create mini project report",
            "objective": "Use academic and professional reference tools",
            "youtubeVideo": "uELfu0qaIJQ"
        },
    
        {
            "module": "Mail Merge",
            "topics": "Letters, labels, envelopes",
            "activity": "Generate bulk letters",
            "objective": "Automate repetitive document creation",
            "youtubeVideo": "mFqCvTOpOL0"
        },
    
        {
            "module": "Review Tools",
            "topics": "Spell check, comments, track changes",
            "activity": "Peer editing exercise",
            "objective": "Review and collaborate on documents",
            "youtubeVideo": "vAHYchBIak"
        },
    
        {
            "module": "Printing and Final Project",
            "topics": "Print settings, export PDF",
            "activity": "Create complete formatted document",
            "objective": "Prepare and finalize professional documents",
            "youtubeVideo": "2MCmnr2L50o"
        },
    
        # =========================
        # MICROSOFT EXCEL
        # =========================
    
        {
            "module": "Introduction to Excel",
            "topics": "Workbook, worksheet, rows, columns, cells",
            "activity": "Create first workbook",
            "objective": "Understand Excel interface and spreadsheets",
            "youtubeVideo": "Vl0H-qTclOg"
        },
    
        {
            "module": "Data Entry and Editing",
            "topics": "Enter, edit, delete data, autofill",
            "activity": "Build student record sheet",
            "objective": "Manage spreadsheet data efficiently",
            "youtubeVideo": "LgXzzu68j7M"
        },
    
        {
            "module": "Cell Formatting",
            "topics": "Number formats, borders, colors",
            "activity": "Format marksheet",
            "objective": "Improve spreadsheet appearance and readability",
            "youtubeVideo": "LgXzzu68j7M"
        },
    
        {
            "module": "Basic Formulas",
            "topics": "Addition, subtraction, multiplication, division",
            "activity": "Calculate totals",
            "objective": "Perform mathematical calculations in Excel",
            "youtubeVideo": "Vl0H-qTclOg"
        },
    
        {
            "module": "Functions",
            "topics": "SUM, AVERAGE, MAX, MIN",
            "activity": "Analyze student marks",
            "objective": "Use built-in Excel functions",
            "youtubeVideo": "Vl0H-qTclOg"
        },
    
        {
            "module": "Cell References",
            "topics": "Relative and absolute references",
            "activity": "Formula copying practice",
            "objective": "Understand formula referencing",
            "youtubeVideo": "Vl0H-qTclOg"
        },
    
        {
            "module": "Sorting and Filtering",
            "topics": "Sort A-Z, filters",
            "activity": "Organize class records",
            "objective": "Organize and search spreadsheet data",
            "youtubeVideo": "LgXzzu68j7M"
        },
    
        {
            "module": "Excel Tables",
            "topics": "Create and manage tables",
            "activity": "Build inventory list",
            "objective": "Use structured tables for data management",
            "youtubeVideo": "LgXzzu68j7M"
        },
    
        {
            "module": "IF Function",
            "topics": "Logical conditions and IF statements",
            "activity": "Grade calculation system",
            "objective": "Apply logical decision-making formulas",
            "youtubeVideo": "Vl0H-qTclOg"
        },
    
        {
            "module": "Lookup Functions",
            "topics": "VLOOKUP and XLOOKUP basics",
            "activity": "Search student data",
            "objective": "Retrieve data dynamically",
            "youtubeVideo": "Vl0H-qTclOg"
        },
    
        {
            "module": "Charts and Graphs",
            "topics": "Bar charts, pie charts, line charts",
            "activity": "Create performance charts",
            "objective": "Visualize data graphically",
            "youtubeVideo": "Vl0H-qTclOg"
        },
    
        {
            "module": "Conditional Formatting",
            "topics": "Highlight rules, duplicate values",
            "activity": "Highlight failed students",
            "objective": "Automatically format cells based on conditions",
            "youtubeVideo": "LgXzzu68j7M"
        },
    
        {
            "module": "Data Validation and Protection",
            "topics": "Dropdown lists, sheet protection",
            "activity": "Create controlled entry form",
            "objective": "Secure and control spreadsheet input",
            "youtubeVideo": "LgXzzu68j7M"
        },
    
        {
            "module": "Macros and Final Project",
            "topics": "Record macros, print worksheets",
            "activity": "Complete financial worksheet",
            "objective": "Automate repetitive Excel tasks",
            "youtubeVideo": "dvbLrwD2SpA"
        },
    
        # =========================
        # MICROSOFT POWERPOINT
        # =========================
    
        {
            "module": "Introduction to PowerPoint",
            "topics": "Interface, slides, layouts",
            "activity": "Create first presentation",
            "objective": "Understand PowerPoint environment",
            "youtubeVideo": "l5Ij7nUy9UQ"
        },
    
        {
            "module": "Creating Slides",
            "topics": "Add, delete, rearrange slides",
            "activity": "Build topic presentation",
            "objective": "Manage presentation slides",
            "youtubeVideo": "l5Ij7nUy9UQ"
        },
    
        {
            "module": "Text Formatting",
            "topics": "Fonts, alignment, WordArt",
            "activity": "Format presentation slides",
            "objective": "Design readable slide text",
            "youtubeVideo": "l5Ij7nUy9UQ"
        },
    
        {
            "module": "Themes and Templates",
            "topics": "Themes and layouts",
            "activity": "Apply professional themes",
            "objective": "Create visually consistent presentations",
            "youtubeVideo": "l5Ij7nUy9UQ"
        },
    
        {
            "module": "Images and Shapes",
            "topics": "Insert pictures, shapes, icons",
            "activity": "Create school advert",
            "objective": "Add visual elements to slides",
            "youtubeVideo": "l5Ij7nUy9UQ"
        },
    
        {
            "module": "SmartArt Graphics",
            "topics": "Process diagrams and hierarchy charts",
            "activity": "Create organization chart",
            "objective": "Represent information visually",
            "youtubeVideo": "l5Ij7nUy9UQ"
        },
    
        {
            "module": "Tables and Charts",
            "topics": "Insert tables and charts",
            "activity": "Present exam statistics",
            "objective": "Display data in presentations",
            "youtubeVideo": "l5Ij7nUy9UQ"
        },
    
        {
            "module": "Audio and Video",
            "topics": "Insert media and playback options",
            "activity": "Add educational video",
            "objective": "Use multimedia in presentations",
            "youtubeVideo": "l5Ij7nUy9UQ"
        },
    
        {
            "module": "Animations",
            "topics": "Entrance, emphasis, motion paths",
            "activity": "Animate slide objects",
            "objective": "Create engaging slide animations",
            "youtubeVideo": "l5Ij7nUy9UQ"
        },
    
        {
            "module": "Transitions",
            "topics": "Slide transitions and timing",
            "activity": "Build smooth slide show",
            "objective": "Apply professional slide transitions",
            "youtubeVideo": "l5Ij7nUy9UQ"
        },
    
        {
            "module": "Hyperlinks and Action Buttons",
            "topics": "Interactive navigation tools",
            "activity": "Create interactive presentation",
            "objective": "Add interactivity to slides",
            "youtubeVideo": "l5Ij7nUy9UQ"
        },
    
        {
            "module": "Slide Master",
            "topics": "Global slide customization",
            "activity": "Customize presentation style",
            "objective": "Maintain design consistency",
            "youtubeVideo": "l5Ij7nUy9UQ"
        },
    
        {
            "module": "Presenter Tools",
            "topics": "Presenter view, notes, rehearsal",
            "activity": "Practice presentation",
            "objective": "Deliver presentations effectively",
            "youtubeVideo": "l5Ij7nUy9UQ"
        },
    
        {
            "module": "Final Presentation Project",
            "topics": "Export PDF/video and final delivery",
            "activity": "Student final presentation",
            "objective": "Create and present a complete project",
            "youtubeVideo": "l5Ij7nUy9UQ"
        }
    
    ]
        
    commands = '''
        Role: You are the Lead Technical Educator for MGY (Malawian Genius Youth). Your mission is to transform technical documentation into high-impact, practical lessons on the Microsoft Office Suite.
        
        Task: Analyze the provided file, focusing strictly on the specified title. From this content, generate a comprehensive lesson tailored for incoming university students.
        
        Core Requirements:
        
        The "University Gap" Context: For every feature or skill taught, you must explicitly explain why it is essential for university success (e.g., "Formatting citations in Word is required for your first-year Research Methods paper").
        
        Step-by-Step Granularity: Provide "No-Skip" instructions. Assume the student has the software open but has never used this specific feature. Use numbered lists for actions.
        
        Relatable Examples: Use "Daily Life" examples relevant to a student in Malawi (e.g., "Creating a budget in Excel for your monthly groceries and transport" or "Designing a PowerPoint for a community youth project").
        
        Tone: Encouraging, professional, and clear. Avoid overly complex jargon without defining it first.
        
        Output Structure:
        
        Title: lesson title
        
        Objective: What will the student achieve?
        
        The "Why": The university relevance.
        
        The Lesson: The step-by-step walkthrough.
        
        Practice Challenge: A small task for the student to complete.
        '''
    data = request.json
    user_message = data.get("message", 1)
    syt_inst = data.get("instructions", '\n')
    if not isinstance(user_message,int):
        return
    model = data.get("model", "gemini-2.5-flash-lite")
    img = data.get("img_url", False)
    contents = [user_message]
    filledlist = []
    text = ''
    def output(reply_text,chat):
        #print(type(reply_text))
        #print(reply_text)
        obj = reply_text #parse_mgy_json(reply_text,chat)
        if obj:
            post = obj
            if old_post:
                listMsg = list(old_post.items())
                lastMsg = listMsg[-1]
            else:
                lastMsg = ["none", {"title": "First Post"}]
            #print(listMsg)
            #print(listMsg)
            mgyPostFormat = {
                'utubeId':ms_office_course[user_message]["youtubeVideo"],
                'prompt': post['post'],
                'title': post['title'],
                'imgUrl': 'android-chrome-192x192.png1776856358198',
                'senderId': 'MGY',
                'userkey': 'mgy',
                'types': ['textMsg'],
                'chatId': int(time.time())*1000,
                "previous_chatId": lastMsg[0],
                "previous_title": lastMsg[1]["title"]
            }
            post_ref.push(mgyPostFormat)
            app_updates.push(mgyPostFormat)
            return obj
            
        return reply_text
        
    
    try:
        extract_config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_json_schema=LessonStructure.model_json_schema(),
            system_instruction="You are a JSON formatter. Turn the provided lesson into a valid JSON object matching the LessonStructure schema. If no important info in text, return an string -> 'MGY'. Note: do not make summary of given data no matter what."
        )
    
        config = types.GenerateContentConfig(
                tools=[
                        types.Tool(
                            file_search=types.FileSearch(
                            file_search_store_names=["fileSearchStores/mgy-library-1nqnlcnpgnhl"]
                            )
                        ) 
                    ],
                #response_mime_type = "application/json",
                #response_json_schema = MatchResult.model_json_schema(),
                system_instruction="You are a Malawian Genius Youths[MGY] AI. Your name is GIC. "+commands+syt_inst
        )
        firebase_init()
        # 1. Get history from Firebase
        ref = db.reference('history')
        history_data = ref.get()
        post_ref = db.reference('post')
        app_updates = db.reference("courses/212d976ac9663306c70651")
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
        
        response = chat.send_message(f"Make today lesson on this module: {ms_office_course[user_message]["module"]}, it must cover: {ms_office_course[user_message]["topics"]}, the goal is: {ms_office_course[user_message]["objective"]} and challage from: {ms_office_course[user_message]["activity"]} .")
        if response.text == 'MGY' or not response.text:
            return 'No update'
        print('plain ans for first chat',response.text)
      
        time.sleep(2)
        extract_chat = client.chats.create(model=model, config=extract_config)
        final_response = extract_chat.send_message(f"Format this lesson into JSON: {response.text}")
        if final_response.text == 'MGY' or not final_response.text:
            return 'No update'
        print('ans from final chat',final_response.text)
        json_data = json.loads(final_response.text)
        return output(json_data,'extract_chat')
    except Exception as e:
        # If something breaks, Render will show this in the "Logs"
        print("--- FULL ERROR START ---")     
        traceback.print_exc()
        print("--- FULL ERROR END ---")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
        
        
        
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
        filledlist = []
        text = ''
        def chatAi():
            def parse_mgy_json(text,chat):
                try:
                    clean_text = text.replace("```json", "").replace("```", "").strip()
                    data = json.loads(clean_text)
                    return data['updates']
                except Exception as e:
                    print("--- FULL ERROR START ---")
                    traceback.print_exc()
                    print("--- FULL ERROR END ---")
                    print(f"Failed to parse JSON: {e}")
                    time.sleep(3)
                    resp = chat.send_message("Oooosh! you haven`t follow output system instructions which has result in code errors. Please read back with care and bring correct format and structure.")
                    reply_text = resp.text
                    return output(reply_text,chat)
                
            def output(reply_text,chat):
                #print(type(reply_text))
                #print(reply_text)
                obj = reply_text #parse_mgy_json(reply_text,chat)
                if obj:
                    post = obj
                    if old_post:
                        listMsg = list(old_post.items())
                        lastMsg = listMsg[-1]
                    else:
                        lastMsg = ["none", {"title": "First Post"}]
                    #print(listMsg)
                    #print(listMsg)
                    if post["urgency"] == 'Low' or post['title'] == 'MGY' or post["source"] == 'MGY':
                        return 'No update'
                    mgyPostFormat = {
                        'imageUrl':post['imageUrl'],
                        'prompt': post['post'],
                        'title': post['title'],
                        'imgUrl': 'android-chrome-192x192.png1776856358198',
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
        
            response = chat.send_message(user_message + '. These are already posted old posts' +json.dumps(old_post))
            if response.text == 'MGY' or not response.text:
                return 'No update'
            print('plain ans for first chat',response.text)
            time.sleep(3)
            extract_chat = client.chats.create(model=model, config=extract_config)
            final_response = extract_chat.send_message(f"Format this news into JSON: {response.text}")
            if final_response.text == 'MGY' or not final_response.text:
                return 'No update'
            print('ans from final chat',final_response.text)
            json_data = json.loads(final_response.text)
            return output(json_data,'extract_chat')

        
          
        def generate():
            response = client.models.generate_content_stream(
                    model = model, 
                    contents = contents,
                    config = config
                )
            
            for chunk in response:
                if chunk.text:
                    filledlist.append(chunk.text)
                    text += chunk.text

        if img:
            file = getFile(img)
            if not file:
                return jsonify({
                    "status": "error",
                    "message": img+' Not found.'
                }), 500
            img = Image.open(file['bytes'])
            contents.insert(0,img)
    
        
        
        
        return jsonify({
            "status": "success",
            "reply": chatAi()#filledlist
        })

    except Exception as e:
        # If something breaks, Render will show this in the "Logs"
        print("--- FULL ERROR START ---")     
        traceback.print_exc()
        print("--- FULL ERROR END ---")
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
        file_name = data.get('name', "unnamed_file") # Use the correct variable name
        url = data.get('url', False)
        
        if not url:
            return jsonify({"status": "error", "message": "No URL provided"}), 400

        # 1. Download the file
        file_content = getFile(url)
        if not file_content:
            return jsonify({"status": "error", "message": "Failed to download file"}), 400
        
        # 2. Create/Get the store
        file_search_store = client.file_search_stores.create(
            config={'display_name': 'MGY Library'}
        )
        stores = client.file_search_stores.list()
        for store in stores:
            if store.name != "fileSearchStores/mgy-library-1nqnlcnpgnhl":
                print(f"Deleting duplicate: {store.name}")
                client.file_search_stores.delete(name=store.name)
        operation = client.file_search_stores.upload_to_file_search_store(
            file=file_content['bytes'],
            file_search_store_name=file_search_store.name,
            config={
                'display_name': file_name,
                'mime_type': file_content['content_type'],
            }
        )

        print(f"STORE FULL NAME: {operation.name}")
        

        return jsonify({
            "status": "success",
            "message": "File upload started. It will be available in the library shortly.",
            "store_name": file_search_store.name
        })

    except Exception as e:
        print(f"Upload Error: {str(e)}") 
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500


# 4. The Entry Point
# Render uses a "Port" to listen for requests
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
    
