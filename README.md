# Full-Stack Machine Failure Panel System

This repository contains the full stack of the Industrial Machine Error Reporting System.

## `machine_panel` (Client UI)
A Python desktop application built with `CustomTkinter` used on the factory floor by operators to quickly declare the start and end of failure events for a given machine. 

## `machine_server` (Backend server & AI reporting)
A FastAPI + SQLite backend that logs events, calculates duration of downtimes, and provides real-time integration with group chat Webhooks (Lark / Feishu). Additionally, it leverages Google Gemini AI to generate daily, weekly, or shift-based performance charts and summaries.

### Architecture
- Client sends JSON HTTP payloads on click.
- Server verifies, logs to SQL, fires instant webhooks to chat, and handles cron-jobs via `generate_report.py`.

## Windows Deployment (Factory Setup)
To run this directly on a Windows PC at the factory:

1. **Clone the repo:** `git clone https://github.com/Madrycrypto/machine-panel-stack.git`
2. **Setup Server:** Inside `machine_server`:
   - Create a virtual environment `python -m venv venv` and activate it `venv\Scripts\activate`
   - `pip install -r requirements.txt`
   - Rename `.env.example` (or create a new `.env` file) and paste your Gemini Key and Lark Webhook.
   - Run the server: `uvicorn main:app --host 0.0.0.0 --port 8000`
3. **Setup/Build Client:** Inside `machine_panel`:
   - Run `build.bat` to compile the app into a portable `.exe`.
   - Distribute the resulting `dist/Panel_Maszyny` folder to every machine on the floor without installing Python.
