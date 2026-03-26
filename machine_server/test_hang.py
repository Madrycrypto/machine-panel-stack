import sqlite3

def test_db():
    print("Connecting to DB...")
    try:
        conn = sqlite3.connect('machine_logs.db', timeout=3)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("Success! Tables:", tables)
        conn.close()
    except Exception as e:
        print("Error connecting to DB:", e)

if __name__ == "__main__":
    test_db()
