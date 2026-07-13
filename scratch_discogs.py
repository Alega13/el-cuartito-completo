import urllib.request
import json
import re

url = "https://api.discogs.com/releases/11231"

req = urllib.request.Request(url, headers={'User-Agent': 'ElCuartitoLabelPrinter/1.0'})
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        
    print(f"Title: {data.get('title')}")
    for t in data.get('tracklist', []):
        print(f"{t.get('position')} - {t.get('title')}")
except Exception as e:
    print(f"Error: {e}")
