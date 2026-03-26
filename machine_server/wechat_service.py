import os
import requests
from dotenv import load_dotenv

load_dotenv()

# We will use Lark (Feishu) Custom Bot Webhook for Group communication
LARK_WEBHOOK = os.getenv("LARK_WEBHOOK_URL")

def send_wechat_notification(message: str, to_user: str = None) -> bool:
    """
    Wysyła powiadomienie na grupę z wykorzystaniem wbudowanego Bota w aplikacji Lark.
    Nazwa wciąż nawiązuje technicznie do starego kodu (wechat_service), aby uniknąć błędów importu,
    ale mechanika łączy się z Larkiem.
    """
    if not LARK_WEBHOOK or LARK_WEBHOOK == "your_lark_webhook_url_here":
        print("Error: Missing LARK_WEBHOOK_URL in .env file.")
        return False
        
    payload = {
        "msg_type": "text",
        "content": {
            "text": message
        }
    }
    
    try:
        response = requests.post(LARK_WEBHOOK, json=payload)
        response.raise_for_status()
        
        result = response.json()
        if result.get("code") == 0:
            print("Successfully sent message to Lark Group.")
            return True
        else:
            print(f"Lark Webhook API error: {result}")
            return False
            
    except Exception as e:
        print(f"Error sending message to Lark: {e}")
        return False
