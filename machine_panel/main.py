import customtkinter as ctk
import configparser
import threading
import requests
from datetime import datetime
import json
import time
import sys
import os

def get_data_dir():
    """ Returns the path to the directory containing either this script or the frozen executable. """
    if getattr(sys, 'frozen', False):
        # If the application is run as a bundle, the PyInstaller bootloader
        # extends the sys module by a flag frozen=True and sets the app 
        # path into sys.executable
        return os.path.dirname(sys.executable)
    else:
        # If run from a Python interpreter
        return os.path.dirname(os.path.abspath(__file__))

# Ensure config path is relative to the executable, not the temp folder
config_path = os.path.join(get_data_dir(), "config.ini")

# Create config if it doesn't exist
if not os.path.exists(config_path):
    config = configparser.ConfigParser()
    config['Settings'] = {
        'machine_id': 'OP120-1', 
        'server_url': 'http://127.0.0.1:8000/api/log',
        'admin_password': 'admin',
        'shift_times': '07:00,15:00,16:30'  # Default shifts
    }
    with open(config_path, 'w') as configfile:
        config.write(configfile)

# Load config
config = configparser.ConfigParser()
config.read(config_path)
MACHINE_ID = config.get('Settings', 'machine_id', fallback='OP120-1')
SERVER_URL = config.get('Settings', 'server_url', fallback='http://127.0.0.1:8000/api/log')
ADMIN_PASSWORD = config.get('Settings', 'admin_password', fallback='admin')
SHIFT_TIMES_STR = config.get('Settings', 'shift_times', fallback='07:00,15:00,16:30')

# Failure Definitions
failures_path = os.path.join(get_data_dir(), "failures.json")
def load_failures():
    default_failures = [
        {"id": 1, "desc": "Brak materiału", "severity": "low"},
        {"id": 2, "desc": "Zacięcie materiału", "severity": "low"},
        {"id": 3, "desc": "Problem z podajnikiem", "severity": "low"},
        {"id": 4, "desc": "Błąd czujnika", "severity": "medium"},
        {"id": 5, "desc": "Przegrzanie silnika", "severity": "medium"},
        {"id": 6, "desc": "Spadek ciśnienia", "severity": "medium"},
        {"id": 7, "desc": "Brak smarowania", "severity": "medium"},
        {"id": 8, "desc": "Awaria zasilania", "severity": "high"},
        {"id": 9, "desc": "Kolizja mechaniczna", "severity": "high"},
        {"id": 10, "desc": "Błąd krytyczny PLC", "severity": "high"},
    ]
    
    if not os.path.exists(failures_path):
        with open(failures_path, 'w', encoding='utf-8') as f:
            json.dump(default_failures, f, ensure_ascii=False, indent=4)
        return default_failures
        
    try:
        with open(failures_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading failures.json: {e}")
        return default_failures

FAILURES = load_failures()

COLORS = {
    "low": {"normal": "#555555", "hover": "#444444", "active": "#FBC02D"},      # Gray / Yellow
    "medium": {"normal": "#555555", "hover": "#444444", "active": "#FBC02D"},   # Gray / Yellow
    "high": {"normal": "#555555", "hover": "#444444", "active": "#FBC02D"},     # Gray / Yellow
}

def send_log(machine_id, worker_id, code, action, desc=None):
    # Use UTC for consistency across all panels (Web, Desktop, Master)
    timestamp = datetime.utcnow().isoformat() + "Z"
    payload = {
        "machine_id": machine_id,
        "worker_id": worker_id,
        "code": code,
        "action": action,
        "timestamp": timestamp,
        "desc": desc
    }
    
    def post_request():
        try:
            headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
            requests.post(SERVER_URL, data=json.dumps(payload), headers=headers, timeout=5)
            print(f"Sent: {payload}")
        except Exception as e:
            print(f"Failed to send request: {e}")

    threading.Thread(target=post_request, daemon=True).start()

def send_ping(machine_id):
    payload = {"machine_id": machine_id}
    # Derive ping URL from server url (e.g. swap /log for /ping)
    ping_url = SERVER_URL.replace("/api/log", "/api/ping")
    
    def post_ping():
        try:
            headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
            requests.post(ping_url, data=json.dumps(payload), headers=headers, timeout=5)
        except Exception:
            pass # Silently fail if server is down

    threading.Thread(target=post_ping, daemon=True).start()

class FailureButton(ctk.CTkButton):
    def __init__(self, master, failure_data, app_instance, **kwargs):
        self.failure_data = failure_data
        self.app_instance = app_instance
        self.is_active = False
        self.severity = failure_data["severity"]
        self.color_scheme = COLORS[self.severity]
        
        raw_desc = self.failure_data['desc'].replace("\\n", "\n")
        button_text = f"{self.failure_data['id']}. {raw_desc}"
        
        super().__init__(
            master, 
            text=button_text, 
            fg_color=self.color_scheme["normal"],
            hover_color=self.color_scheme["hover"],
            font=ctk.CTkFont(size=24, weight="bold"),
            command=self.toggle_state,
            **kwargs
        )
        self.pulse_job = None
        self.pulse_state = False

    def toggle_state(self):
        machine_id = self.app_instance.machine_entry.get().strip()
        worker_id = self.app_instance.worker_entry.get().strip()
        
        if not machine_id or not worker_id:
            return  # Do nothing if inputs are empty
            
        self.is_active = not self.is_active
        action = "START" if self.is_active else "STOP"
        
        # Notify the app to update the timer
        self.app_instance.on_failure_toggled(self.is_active)
        
        # Send API request
        send_log(machine_id, worker_id, self.failure_data["id"], action, self.failure_data["desc"])
        
        if self.is_active:
            self.start_pulse()
        else:
            self.stop_pulse()

    def start_pulse(self):
        if self.pulse_job is not None:
            self.after_cancel(self.pulse_job)
        self.pulse_state = not self.pulse_state
        
        if self.pulse_state:
            self.configure(fg_color=self.color_scheme["active"])
        else:
            self.configure(fg_color=self.color_scheme["normal"])
            
        self.pulse_job = self.after(500, self.start_pulse)

    def stop_pulse(self):
        if self.pulse_job is not None:
            self.after_cancel(self.pulse_job)
            self.pulse_job = None
        self.configure(fg_color=self.color_scheme["normal"])
        
class App(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title(f"Panel Zgłaszania Awarii - {MACHINE_ID}")
        
        # Szerokość 550px, wysokość trochę większa by na maksa wykorzystać ekran i uniknąć ucięć przy guzikach
        self.geometry("550x1000-0+0")
        
        # Wymusza bycie zawsze na wierzchu (nie przykryją tego inne okna maszynowe)
        self.attributes("-topmost", True)
        
        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("blue")
        
        # Shift Management Vars
        self.last_reset_date = datetime.now().strftime("%Y-%m-%d %H:%M") # Store last time we reset to prevent looping
        self.shift_times = []
        for time_str in SHIFT_TIMES_STR.split(','):
            try:
                h, m = map(int, time_str.strip().split(':'))
                self.shift_times.append((h, m))
            except:
                pass
        
        # Build UI Elements
        self.failures = load_failures()
        self.build_ui()
        
        # Overlay variables
        self.overlay_frame = None
        
        # Initial boot - show login
        self.after(200, self.show_login_overlay)
        
        # Start background check
        self.after(5000, self.check_shift_boundary)
        
        # Start heartbeat
        self.after(1000, self.start_ping_loop)

    def start_ping_loop(self):
        send_ping(self.machine_entry.get().strip())
        self.after(5000, self.start_ping_loop)

    def build_ui(self):
        # Top Frame for Inputs
        self.top_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.top_frame.pack(fill="x", padx=20, pady=(10, 0))
        
        self.machine_label = ctk.CTkLabel(self.top_frame, text="ID Maszyny:", font=ctk.CTkFont(size=14, weight="bold"))
        self.machine_label.pack(side="left", padx=(0, 5))
        
        self.machine_entry = ctk.CTkEntry(self.top_frame, font=ctk.CTkFont(size=14), width=80) 
        self.machine_entry.insert(0, MACHINE_ID)
        self.machine_entry.pack(side="left", padx=(0, 10))
        
        self.worker_label = ctk.CTkLabel(self.top_frame, text="ID Prac.:", font=ctk.CTkFont(size=14, weight="bold"))
        self.worker_label.pack(side="left", padx=(0, 5))
        
        # Worker Entry is now readonly, it gets filled by the overlay
        self.worker_entry = ctk.CTkEntry(self.top_frame, font=ctk.CTkFont(size=14), width=130, state="normal")
        self.worker_entry.pack(side="left")
        self.worker_entry.configure(state="readonly")
        
        # Zmiana Pracownika Button
        self.change_worker_btn = ctk.CTkButton(self.top_frame, text="Zmień", width=50, height=28, font=ctk.CTkFont(size=12), fg_color="#E64A19", hover_color="#D84315", command=self.reset_worker)
        self.change_worker_btn.pack(side="left", padx=(5, 0))

        # Admin Button
        self.admin_btn = ctk.CTkButton(self.top_frame, text="⚙️ Admin", font=ctk.CTkFont(size=12), width=70, height=28, command=self.open_admin_auth)
        self.admin_btn.pack(side="right")
        
        # Timer Label (Larger, replaces the huge title)
        # Czcionka "Menlo" lub "Courier" dla efektu cyfrowego, maksymalny rozmiar jaki wejdzie w 550px szerokości okna
        self.timer_label = ctk.CTkLabel(self, text="00:00:00", text_color="gray", font=ctk.CTkFont(family="Menlo", size=105, weight="bold"))
        self.timer_label.pack(pady=(15, 15))
        
        self.active_failures_count = 0
        self.timer_start_time = None
        self.timer_pulse_state = False
        self.update_timer()
        
        # Build grid based on loaded failures
        self.grid_frame = None
        self.rebuild_grid()

    def rebuild_grid(self):
        # Destroy the whole frame to completely clear old Tkinter row weights
        if hasattr(self, 'grid_frame') and self.grid_frame is not None:
            self.grid_frame.destroy()
            
        self.grid_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.grid_frame.pack(expand=True, fill="both", padx=10, pady=10)
            
        import math
        num_failures = len(self.failures)
        num_rows = math.ceil(num_failures / 2) if num_failures > 0 else 1
        
        self.grid_frame.columnconfigure((0, 1), weight=1, uniform="col")
        for i in range(num_rows):
            self.grid_frame.rowconfigure(i, weight=1, uniform="row")
            
        for i, f_data in enumerate(self.failures):
            # Fill Left-Right, Top-Bottom
            row = i // 2
            col = i % 2
            
            btn = FailureButton(self.grid_frame, failure_data=f_data, app_instance=self)
            # Remove hardcoded height to allow dynamic filling
            btn.grid(row=row, column=col, sticky="nsew", padx=5, pady=5)
            
            # Text wrapping
            btn._text_label.configure(wraplength=220)

    def update_timer(self):
        if self.active_failures_count > 0 and self.timer_start_time is not None:
            elapsed = int(time.time() - self.timer_start_time)
            hours = elapsed // 3600
            minutes = (elapsed % 3600) // 60
            seconds = elapsed % 60
            self.timer_label.configure(text=f"{hours:02d}:{minutes:02d}:{seconds:02d}")
            
            # Pulse logic for the timer
            self.timer_pulse_state = not self.timer_pulse_state
            if self.timer_pulse_state:
                self.timer_label.configure(text_color=COLORS["low"]["active"])
            else:
                self.timer_label.configure(text_color="gray")
        else:
            self.timer_label.configure(text="00:00:00", text_color="gray")
            self.timer_pulse_state = False
            
        self.after(500, self.update_timer)  # Zmieniono z 1000 na 500, by zgrać się z tempem 500ms z przycisków

    def check_shift_boundary(self):
        now = datetime.now()
        current_time_str = now.strftime("%Y-%m-%d %H:%M")
        
        # Skip if we already reset this exact minute
        if current_time_str != self.last_reset_date:
            for shift_h, shift_m in self.shift_times:
                if now.hour == shift_h and now.minute == shift_m:
                    self.last_reset_date = current_time_str
                    print(f"Shift Boundary Reached: {shift_h:02d}:{shift_m:02d}")
                    # Stop active failures if any
                    for btn in self.grid_frame.winfo_children():
                        if isinstance(btn, FailureButton) and btn.is_active:
                            btn.toggle_state() # this will logically stop it
                    
                    self.reset_worker()
                    break
                    
        self.after(30000, self.check_shift_boundary) # Check every 30 seconds
        
    def reset_worker(self):
        self.worker_entry.configure(state="normal")
        self.worker_entry.delete(0, "end")
        self.worker_entry.configure(state="readonly")
        self.show_login_overlay()
        
    def show_login_overlay(self):
        if self.overlay_frame is not None:
            return
            
        self.overlay_frame = ctk.CTkFrame(self, fg_color="#212121", corner_radius=0)
        self.overlay_frame.place(relx=0, rely=0, relwidth=1, relheight=1) # Cover entire window
        
        login_label = ctk.CTkLabel(self.overlay_frame, text="Wprowadź swoje dane", font=ctk.CTkFont(size=36, weight="bold"))
        login_label.pack(pady=(200, 20))
        
        inst_label = ctk.CTkLabel(self.overlay_frame, text="Odbicie na panelu maszynowym:", text_color="gray", font=ctk.CTkFont(size=18))
        inst_label.pack(pady=(0, 30))
        
        self.login_entry = ctk.CTkEntry(self.overlay_frame, width=350, height=60, font=ctk.CTkFont(size=24), placeholder_text="Imię i Nazwisko", justify="center")
        self.login_entry.pack(pady=(0, 30))
        # Add binding so pressing Enter also logs in
        self.login_entry.bind('<Return>', lambda event: self.process_login())
        
        self.login_entry.focus()
        
        login_btn = ctk.CTkButton(self.overlay_frame, text="ROZPOCZNIJ PRACĘ", width=350, height=80, font=ctk.CTkFont(size=24, weight="bold"), fg_color="#2E7D32", hover_color="#1B5E20", command=self.process_login)
        login_btn.pack()
        
    def process_login(self):
        worker_name = self.login_entry.get().strip()
        if not worker_name:
            # Maybe flash red
            self.login_entry.configure(border_color="red")
            return
            
        # Update underlying ui
        self.worker_entry.configure(state="normal")
        self.worker_entry.delete(0, "end")
        self.worker_entry.insert(0, worker_name)
        self.worker_entry.configure(state="readonly")
        
        # Destroy overlay
        if self.overlay_frame:
            self.overlay_frame.destroy()
            self.overlay_frame = None

    def on_failure_toggled(self, is_active):
        if is_active:
            if self.active_failures_count == 0:
                self.timer_start_time = time.time()
            self.active_failures_count += 1
        else:
            self.active_failures_count -= 1
            if self.active_failures_count < 0:
                self.active_failures_count = 0
            if self.active_failures_count == 0:
                self.timer_start_time = None

    def open_admin_auth(self):
        dialog = ctk.CTkInputDialog(text="Wprowadź hasło administratora:", title="Logowanie Administratora")
        password = dialog.get_input()
        
        if password == ADMIN_PASSWORD:
            self.open_admin_panel()
        elif password is not None:
            # Pokaż błąd lub zignoruj (można dodać messagebox z informacją)
            pass

    def open_admin_panel(self):
        self.admin_window = ctk.CTkToplevel(self)
        self.admin_window.title("Panel Administracyjny")
        self.admin_window.geometry("600x800")
        self.admin_window.transient(self) # stays on top of main window
        self.admin_window.grab_set() # capture events
        
        main_frame = ctk.CTkScrollableFrame(self.admin_window)
        main_frame.pack(fill="both", expand=True, padx=20, pady=20)
        
        ctk.CTkLabel(main_frame, text="USTAWIENIA GŁÓWNE (Wymagają restartu)", font=ctk.CTkFont(weight="bold")).pack(anchor="w", pady=(0, 10))
        
        # New machine ID (default is in config)
        ctk.CTkLabel(main_frame, text="Domyślne ID Maszyny:").pack(anchor="w")
        self.cfg_machine_entry = ctk.CTkEntry(main_frame, width=300)
        self.cfg_machine_entry.insert(0, MACHINE_ID)
        self.cfg_machine_entry.pack(anchor="w", pady=(0, 10))
        
        # Server URL Address
        ctk.CTkLabel(main_frame, text="Adres IP Bazy Danych (zwróć uwagę na format z końcówką!):").pack(anchor="w")
        self.cfg_server_entry = ctk.CTkEntry(main_frame, width=400)
        self.cfg_server_entry.insert(0, SERVER_URL)
        self.cfg_server_entry.pack(anchor="w", pady=(0, 10))
        
        # Admin Password
        ctk.CTkLabel(main_frame, text="Hasło Administratora:").pack(anchor="w")
        self.cfg_pwd_entry = ctk.CTkEntry(main_frame, width=300, show="*")
        self.cfg_pwd_entry.insert(0, ADMIN_PASSWORD)
        self.cfg_pwd_entry.pack(anchor="w", pady=(0, 20))
        
        # Shift Times
        ctk.CTkLabel(main_frame, text="Godziny Zmian (oddzielone przecinkiem):").pack(anchor="w")
        self.cfg_shift_entry = ctk.CTkEntry(main_frame, width=300)
        self.cfg_shift_entry.insert(0, SHIFT_TIMES_STR)
        self.cfg_shift_entry.pack(anchor="w", pady=(0, 20))
        
        ctk.CTkLabel(main_frame, text="NAZWY AWARII (Wpisz ciąg \\n aby zrobić tekst w dwóch liniach)", font=ctk.CTkFont(weight="bold")).pack(anchor="w", pady=(10, 10))
        
        self.admin_failures_frame = ctk.CTkFrame(main_frame, fg_color="transparent")
        self.admin_failures_frame.pack(fill="x", pady=5)
        
        # Load current failures into a temporary list for editing
        self.editing_failures = [dict(f) for f in self.failures]
        self.redraw_failure_admin_list()
        
        # Add (+) Button
        ctk.CTkButton(main_frame, text="+ Dodaj nową awarię", command=self.add_admin_failure, fg_color="#1976D2", hover_color="#1565C0").pack(pady=10)
        
        btn_frame = ctk.CTkFrame(self.admin_window, fg_color="transparent")
        btn_frame.pack(fill="x", padx=20, pady=20)
        
        ctk.CTkButton(btn_frame, text="Zapisz i Zamknij", command=self.save_admin_changes, fg_color="green", hover_color="darkgreen").pack(side="right", padx=10)
        ctk.CTkButton(btn_frame, text="Anuluj", command=self.admin_window.destroy, fg_color="gray", hover_color="darkgray").pack(side="right")

    def redraw_failure_admin_list(self):
        # Clear existing
        for widget in self.admin_failures_frame.winfo_children():
            widget.destroy()
            
        self.admin_failure_entries = []
        for i, failure in enumerate(self.editing_failures):
            frame = ctk.CTkFrame(self.admin_failures_frame, fg_color="transparent")
            frame.pack(fill="x", pady=2)
            
            # Label
            ctk.CTkLabel(frame, text=f"Prz. {i+1}:", width=50).pack(side="left")
            
            # Entry
            entry = ctk.CTkEntry(frame, width=320)
            entry.insert(0, failure.get("desc", ""))
            entry.pack(side="left", padx=5)
            
            # Set severity default if missing
            severity = failure.get("severity", "low")
            
            # Delete Button
            # Pass i = i to lambda to break late binding closure bug in python
            del_btn = ctk.CTkButton(frame, text="X", width=30, fg_color="#d32f2f", hover_color="#b71c1c", command=lambda idx=i: self.remove_admin_failure(idx))
            del_btn.pack(side="left", padx=5)
            
            self.admin_failure_entries.append({"entry": entry, "severity": severity})

    def add_admin_failure(self):
        # Save current typed states before redrawing
        for i, item in enumerate(self.admin_failure_entries):
            if i < len(self.editing_failures):
                self.editing_failures[i]["desc"] = item["entry"].get()
                
        # Append new
        new_id = len(self.editing_failures) + 1
        self.editing_failures.append({"id": new_id, "desc": "Nowa awaria", "severity": "low"})
        self.redraw_failure_admin_list()

    def remove_admin_failure(self, idx):
        # Save current typed states before redrawing
        for i, item in enumerate(self.admin_failure_entries):
            if i < len(self.editing_failures):
                self.editing_failures[i]["desc"] = item["entry"].get()
                
        # Remove
        if 0 <= idx < len(self.editing_failures):
            self.editing_failures.pop(idx)
            
        self.redraw_failure_admin_list()

    def save_admin_changes(self):
        # Update Config
        new_machine_id = self.cfg_machine_entry.get()
        new_server_url = self.cfg_server_entry.get()
        new_pwd = self.cfg_pwd_entry.get()
        new_shifts = self.cfg_shift_entry.get()
        
        config['Settings']['machine_id'] = new_machine_id
        config['Settings']['server_url'] = new_server_url
        config['Settings']['admin_password'] = new_pwd
        config['Settings']['shift_times'] = new_shifts
        
        with open(config_path, 'w') as configfile:
            config.write(configfile)
            
        # Update JSON Data
        new_failures = []
        for i, item in enumerate(self.admin_failure_entries):
            new_failures.append({
                "id": i + 1,  # Ensure sequential IDs
                "desc": item["entry"].get(),
                "severity": item.get("severity", "low")
            })
            
        with open(failures_path, 'w', encoding='utf-8') as f:
            json.dump(new_failures, f, ensure_ascii=False, indent=4)
            
        print("Zapisano zmiany.")
        
        # Apply changes immediately to main UI
        self.machine_entry.configure(state="normal")
        self.machine_entry.delete(0, "end")
        self.machine_entry.insert(0, new_machine_id)
        self.title(f"Panel Zgłaszania Awarii - {new_machine_id}")
        self.machine_entry.configure(state="readonly")
        
        # Update failures array and redraw UI completely dynamic!
        self.failures = new_failures
        self.rebuild_grid()
        
        self.admin_window.destroy()

if __name__ == "__main__":
    app = App()
    app.mainloop()
