import http.server
import urllib.request
import urllib.parse
import json
import os
import sys
import webbrowser
import threading
import time

# Naver API Config (from auth.js logic)
CLIENT_ID = "3mfvr3zq2y"
CLIENT_SECRET = "yAJRpCO2QIeBvvQPsasagjfohld9BJSns92BXMWe"

# Path handling for PyInstaller
def get_resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)

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
    # Ensure current dir is where the script is located
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Run browser opener in a separate thread
    threading.Thread(target=open_browser, args=(PORT,), daemon=True).start()
    
    with http.server.HTTPServer(("", PORT), ProxyHandler) as httpd:
        print(f"RoadSeaker Server (Standalone Mode) running at http://localhost:{PORT}")
        print("Press Ctrl+C to stop the server.")
        httpd.serve_forever()
