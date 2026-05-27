#!/usr/bin/env python3
import http.server
import socketserver
import os

# Change to the directory containing the test file
os.chdir(os.path.dirname(os.path.abspath(__file__)))

PORT = 3001
Handler = http.server.SimpleHTTPServer if hasattr(http.server, 'SimpleHTTPServer') else http.server.SimpleHTTPRequestHandler

class CORSHTTPRequestHandler(Handler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

with socketserver.TCPServer(("", PORT), CORSHTTPRequestHandler) as httpd:
    print(f"Serving CORS test at http://localhost:{PORT}")
    print(f"Open: http://localhost:{PORT}/test-cors.html")
    print("Press Ctrl+C to stop")
    httpd.serve_forever()