#!/bin/bash

# Nazwa skryptu: Uruchom Panel Okienkowy.command
# Służy do uruchamiania lokalnej okienkowej aplikacji operatora (CustomTkinter).

cd "$(dirname "$0")"

echo "=========================================="
echo "Uruchamianie Panelu Maszyny (Okienkowy)..."
echo "=========================================="

# Sprawdzenie środowiska i instalacja
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "Tworzenie nowego środowiska wirtualnego..."
    python3 -m venv venv
    source venv/bin/activate
    echo "Instalowanie wymaganych bibliotek (customtkinter, requests)..."
    pip install customtkinter requests
fi

echo "Startowanie aplikacji main.py..."
python3 main.py
