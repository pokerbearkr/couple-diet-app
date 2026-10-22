"""
커플 다이어트 & 운동 메이트 (Couple Fit) - 로컬 개발 서버 실행기
"""

import http.server
import socketserver
import webbrowser
import os

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

if __name__ == '__main__':
    # 보안 규정에 따라 localhost (127.0.0.1) 바인딩
    server_address = ('127.0.0.1', PORT)
    
    with socketserver.TCPServer(server_address, Handler) as httpd:
        url = f"http://127.0.0.1:{PORT}/index.html"
        print("=" * 60)
        print("💖 커플 다이어트 & 운동 메이트 (Couple Fit) 서버가 실행되었습니다!")
        print(f"👉 브라우저 접속 주소: {url}")
        print("💡 종료하려면 터미널에서 Ctrl + C 를 누르세요.")
        print("=" * 60)
        webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n서버를 종료합니다. 오늘도 즐거운 하루 되세요! 💑")
