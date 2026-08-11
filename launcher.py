from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import threading
import webbrowser

HOST = "127.0.0.1"
PORT = 4187
ROOT = Path(__file__).resolve().parent

os.chdir(ROOT)
server = ThreadingHTTPServer((HOST, PORT), SimpleHTTPRequestHandler)
url = f"http://{HOST}:{PORT}"

print("Meu Superdia está funcionando.")
print(f"Acesse: {url}")
print("Feche esta janela ou pressione Ctrl+C para encerrar.")
threading.Timer(0.8, lambda: webbrowser.open(url)).start()

try:
    server.serve_forever()
except KeyboardInterrupt:
    print("\nMeu Superdia encerrado.")
finally:
    server.server_close()
