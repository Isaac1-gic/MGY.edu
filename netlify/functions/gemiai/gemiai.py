from google import genai
import json

def handler(event,context):
    try:
        body = json.loads(event['body'])
        # The client gets the API key from the environment variable `GEMINI_API_KEY`
        client = genai.Client()
        response = client.models.generate_content(
        model="gemini-2.5-flash-lite", contents=body['question']
        )
        print(response.text)
        return { "statusCode": 200,"body": json.dumps({"response": response.text})}
    except:
        return { "statusCode": 500,"body": json.dumps({"message": 'Bad request'})}
