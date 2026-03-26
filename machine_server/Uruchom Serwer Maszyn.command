#!/bin/bash

# Nazwa skryptu: Uruchom Serwer Maszyn.command
# Służy do uruchamiania serwera i dashboardu jednym kliknięciem na systemach macOS.

cd "$(dirname "$0")"

echo "=========================================="
echo "Uruchamianie Serwera Panelu Maszynowego..."
echo "=========================================="

# Sprawdzenie czy istnieje środowisko wirtualne
if [ -d "venv" ]; then
    echo "Aktywowanie środowiska wirtualnego..."
    source venv/bin/activate
else
    echo "UWAGA: Nie znaleziono folderu 'venv'."
    echo "Tworzenie nowego środowiska wirtualnego..."
    python3 -m venv venv
    source venv/bin/activate
    echo "Instalowanie wymaganych bibliotek..."
    pip install -r requirements.txt
    
    if [ ! -f ".env" ] && [ -f ".env.example" ]; then
        echo "Tworzenie pliku .env z szablonu .env.example..."
        cp .env.example .env
    fi
fi

# Otwórz przeglądarkę domyślnie pod adresem dashboardu
echo "Otwieranie przeglądarki na stronie Master Dashboard..."
sleep 2
open "http://127.0.0.1:8000/master.html" &

echo "Startowanie serwera..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
