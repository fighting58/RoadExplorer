import http.server
import urllib.request
import urllib.parse
import json
import os
import sys
import webbrowser
import threading
import time

CLIENT_ID = None
CLIENT_SECRET = None

# Path handling for PyInstaller
def get_resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    # Outside PyInstaller, assume assets are in the same folder as server.py
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), relative_path)

# Determine the directory where the binary or script is located
if getattr(sys, 'frozen', False):
    EXE_DIR = os.path.dirname(sys.executable)
else:
    EXE_DIR = os.path.dirname(os.path.abspath(__file__))

def load_auth_config(config_path):
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Missing auth config: {config_path}")

    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    client_id = str(config.get("client_id", "")).strip()
    client_secret = str(config.get("client_secret", "")).strip()

    if not client_id or not client_secret:
        raise ValueError("auth.json must include non-empty client_id and client_secret")

    return client_id, client_secret

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Override to serve from our resource path
        path = super().translate_path(path)
        rel_path = os.path.relpath(path, os.getcwd())
        return get_resource_path(rel_path)

    def do_GET(self):
        if self.path.startswith('/map-proxy'):
            parsed = urllib.parse.urlparse(self.path)
            query = parsed.query
            naver_url = f"https://maps.apigw.ntruss.com/map-static/v2/raster?{query}"
            
            req = urllib.request.Request(naver_url)
            req.add_header('x-ncp-apigw-api-key-id', CLIENT_ID)
            req.add_header('x-ncp-apigw-api-key', CLIENT_SECRET)
            
            try:
                with urllib.request.urlopen(req) as response:
                    content = response.read()
                    self.send_response(200)
                    self.send_header('Content-type', 'image/png')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(content)
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(e).encode())
        else:
            super().do_GET()

def open_browser(port):
    time.sleep(1.5) # Wait for server to start
    url = f"http://localhost:{port}"
    print(f"Opening browser at {url}...")
    webbrowser.open(url)

if __name__ == "__main__":
    PORT = 8000
    # Ensure we use a consistent base for asset searches
    # No longer needed to chdir as get_resource_path handles it
    
    # 1. First, check for external auth.json in EXE/script directory (user override)
    # 2. Fall back to bundled auth.json (if available)
    external_auth = os.path.join(EXE_DIR, "auth.json")
    internal_auth = get_resource_path("auth.json")
    
    auth_path = external_auth if os.path.exists(external_auth) else internal_auth

    try:
        if not os.path.exists(auth_path):
            raise FileNotFoundError(f"Missing auth config: auth.json")
        CLIENT_ID, CLIENT_SECRET = load_auth_config(auth_path)
    except Exception as e:
        print(f"[ERROR] {e}")
        print("Create auth.json from auth.json.example and set your Naver API keys.")
        sys.exit(1)
    
    # Run browser opener in a separate thread
    threading.Thread(target=open_browser, args=(PORT,), daemon=True).start()
    
    with http.server.HTTPServer(("", PORT), ProxyHandler) as httpd:
        print(f"RoadExplorer Server (Standalone Mode) running at http://localhost:{PORT}")
        print("Press Ctrl+C to stop the server.")
        httpd.serve_forever()
