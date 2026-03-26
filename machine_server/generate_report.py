import os
import sys
import argparse
import sqlite3
import pandas as pd
from google import genai
from datetime import datetime, timedelta
from dotenv import load_dotenv

from wechat_service import send_wechat_notification

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

# Lazy-init: do NOT create client at module level (breaks PyInstaller .env loading)
_genai_client = None

def get_genai_client():
    global _genai_client
    if _genai_client is None:
        key = os.getenv("GEMINI_API_KEY")
        if not key:
            raise ValueError("GEMINI_API_KEY not found in environment. Check .env file.")
        _genai_client = genai.Client(api_key=key)
    return _genai_client

def _bundle_dir():
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))

def _data_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

DB_PATH = os.path.join(_data_dir(), "machine_logs.db")

def fetch_data(period_name: str, days_back: float):
    conn = sqlite3.connect(DB_PATH)
    
    query = f"""
        SELECT machine_id, code, desc, COUNT(*) as count, SUM(duration_seconds) as total_duration
        FROM failure_sessions
        WHERE start_time >= datetime('now', '-{days_back} days')
        GROUP BY machine_id, code, desc
    """
    
    df = pd.read_sql_query(query, conn)
    conn.close()
    return df

def generate_report(data_df: pd.DataFrame, period_name: str):
    if data_df.empty:
        return f"No failures recorded during '{period_name}'! 🎉 / '{period_name}' 期间没有机器故障！🎉"

    data_string = data_df.to_string(index=False)
    
    prompt = f"""Analyze the following machine failure data for the period: '{period_name}'. 
Format it VERY CONCISELY and cleanly for a mobile messaging app (use **bold** etc).

Data (Machine ID, Error Code, Description, Count, Total Time in Seconds):
{data_string}

Requirements for the report:
1. Provide the report in BOTH English and Simplified Chinese (e.g. "Total Time / 总时间").
2. Use a short bulleted format with emojis (e.g. 🔴).
3. List ONLY the top 3 worst, most time-consuming problems across all machines (convert seconds to legible min/hours).
4. At the very bottom, draw a small, text-based ASCII bar chart (using block characters like █) to compare the top 3 worst-performing machines in this period. The bars should reflect the proportions of downtime.
5. Do not include any intros or explanations of who you are. Just start the raw analytical report directly."""

    try:
        client = get_genai_client()
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        return response.text
    except Exception as e:
        print(f"Error generating report from Gemini: {e}")
        return f"Wystąpił błąd AI: {e}"

def run_report_generation():
    """Wtyczka dla serwera FastAPI by wywołać to w tle."""
    cfg = {"name": "Dniówka (24h)", "days": 1.0}
    try:
        data = fetch_data(cfg['name'], cfg['days'])
        report_text = generate_report(data, cfg['name'])
        send_wechat_notification(report_text)
    except Exception as e:
        print(f"Błąd podczas asynchronicznego generowania raportu: {e}")

def main():
    parser = argparse.ArgumentParser(description="Generuj raport uszkodzeń maszyn i wyślij na Lark.")
    parser.add_argument("--period", type=str, choices=["shift", "daily", "weekly", "monthly"], default="daily", help="Wybierz okres dla którego generujesz raport (domyślnie daily).")
    args = parser.parse_args()
    
    period_map = {
        "shift": {"name": "Zmiana (8h)", "days": 0.33},     # 8 hours out of 24
        "daily": {"name": "Dniówka (24h)", "days": 1.0},
        "weekly": {"name": "Tygodniówka (7 dni)", "days": 7.0},
        "monthly": {"name": "Miesięczny (30 dni)", "days": 30.0}
    }
    
    cfg = period_map[args.period]
    print(f"Rozpoczynam analizę danych dla: {cfg['name']}")
    
    data = fetch_data(cfg['name'], cfg['days'])
    print(f"Pobrano {len(data)} podsumowanych rodzajów awarii z bazy.")
    
    report_text = generate_report(data, cfg['name'])
    print("\nWygenerowano raport AI:\n")
    print(report_text)
    print("\n----------------\n")
    
    success = send_wechat_notification(report_text)
    if success:
        print(f"Raport '{cfg['name']}' wysłany gładko na grupę Lark.")
    else:
        print("Błąd podczas wysyłania powiadomienia na Lark.")

if __name__ == "__main__":
    main()
