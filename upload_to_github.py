"""
====================================================================
💑 커플 핏 (Couple Fit) - GitHub 자동 업로드 & GitHub Pages 배포 스크립트
Git 설치 없이 순수 Python만으로 GitHub에 자동 생성 및 업로드합니다.
====================================================================
"""

import os
import sys
import json
import base64
import urllib.request
import urllib.error

APP_DIR = os.path.dirname(os.path.abspath(__file__))

FILES_TO_UPLOAD = [
    'index.html',
    'style.css',
    'app.js',
    'manifest.json',
    'sw.js',
    'icon-192.png',
    'icon-512.png',
    'README.md',
    'supabase_schema.sql'
]

def make_request(url, method='GET', headers=None, data=None):
    if headers is None:
        headers = {}
    
    body = None
    if data is not None:
        body = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            return response.status, json.loads(res_body) if res_body else {}
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        try:
            return e.code, json.loads(err_msg)
        except Exception:
            return e.code, {"message": err_msg}

def main():
    print("=" * 65)
    print("💖 [Couple Fit] GitHub 원클릭 자동 업로드 및 무료 호스팅 도구")
    print("=" * 65)
    print("GitHub 계정의 Personal Access Token (토큰)을 이용하여")
    print("저장소 생성부터 모든 파일 업로드, GitHub Pages 배포까지 자동 처리합니다.\n")
    
    print("📌 [GitHub 토큰 발급 30초 가이드]")
    print("1. https://github.com/settings/tokens/new 접속 (로그인 필요)")
    print("2. Note에 'couple-app' 입력")
    print("3. Expiration(유효기간): 원하는 기간 (예: 90 days)")
    print("4. Select scopes에서 [repo] 에 체크 ☑️")
    print("5. 맨 아래 [Generate token] 클릭 후 나온 ghp_... 로 시작하는 토큰 복사\n")

    token = input("🔑 GitHub Personal Access Token을 붙여넣어 주세요: ").strip()
    if not token:
        print("❌ 토큰이 입력되지 않아 종료합니다.")
        return

    repo_name = input("📁 생성할 저장소 이름 (엔터 시 'couple-diet-app'): ").strip()
    if not repo_name:
        repo_name = 'couple-diet-app'

    auth_headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'CoupleFit-Uploader'
    }

    # 1. 사용자 정보 가져오기
    print("\n🔍 1단계: GitHub 계정 확인 중...")
    status, user_info = make_request('https://api.github.com/user', headers=auth_headers)
    if status != 200:
        print(f"❌ GitHub 인증 실패 (코드 {status}): {user_info.get('message', '토큰을 다시 확인해주세요.')}")
        return

    username = user_info['login']
    print(f"✅ 로그인 성공: {username} 님 반갑습니다!")

    # 2. 저장소 생성 (있으면 기존 것 사용)
    print(f"\n📦 2단계: '{repo_name}' 저장소 확인 및 생성 중...")
    create_repo_data = {
        'name': repo_name,
        'description': '💑 오동원 & 김해솔 커플 다이어트 & 운동 메이트 앱',
        'private': False, # GitHub Pages 무료 배포를 위해 Public 설정
        'auto_init': True
    }
    status, repo_res = make_request('https://api.github.com/user/repos', method='POST', headers=auth_headers, data=create_repo_data)

    if status == 201:
        print(f"✅ 새 저장소가 생성되었습니다: https://github.com/{username}/{repo_name}")
    elif status == 422:
        print(f"ℹ️ 이미 동일한 이름의 저장소가 존재합니다. 파일 업로드를 계속 진행합니다.")
    else:
        print(f"⚠️ 저장소 생성 알림: {repo_res.get('message')}")

    # 3. 파일들 업로드
    print("\n🚀 3단계: 파일 업로드 시작...")
    for filename in FILES_TO_UPLOAD:
        file_path = os.path.join(APP_DIR, filename)
        if not os.path.exists(file_path):
            continue

        with open(file_path, 'rb') as f:
            content_bytes = f.read()
            content_b64 = base64.b64encode(content_bytes).decode('utf-8')

        # 기존 파일 SHA 확인
        file_url = f'https://api.github.com/repos/{username}/{repo_name}/contents/{filename}'
        get_status, get_res = make_request(file_url, headers=auth_headers)

        put_data = {
            'message': f'Upload {filename}',
            'content': content_b64,
            'branch': 'main'
        }
        if get_status == 200 and 'sha' in get_res:
            put_data['sha'] = get_res['sha']

        put_status, put_res = make_request(file_url, method='PUT', headers=auth_headers, data=put_data)
        if put_status in (200, 201):
            print(f"  ✓ {filename} 업로드 완료")
        else:
            print(f"  ✗ {filename} 업로드 실패: {put_res.get('message')}")

    # 4. GitHub Pages 자동 활성화
    print("\n🌐 4단계: 무료 웹사이트(GitHub Pages) 자동 활성화 중...")
    pages_url = f'https://api.github.com/repos/{username}/{repo_name}/pages'
    pages_data = {
        'source': {
            'branch': 'main',
            'path': '/'
        }
    }
    p_status, p_res = make_request(pages_url, method='POST', headers=auth_headers, data=pages_data)
    
    live_url = f"https://{username}.github.io/{repo_name}/"
    print("\n" + "=" * 65)
    print("🎉 모든 파일이 GitHub에 성공적으로 배포되었습니다!")
    print(f"👉 GitHub 저장소: https://github.com/{username}/{repo_name}")
    print(f"👉 무료 앱 접속 주소: {live_url}")
    print("=" * 65)
    print("\n📱 [스마트폰에서 접속하는 방법]")
    print(f"1. 위 주소({live_url})로 접속합니다. (최초 활성화까지 약 1~2분 소요)")
    print("2. 김해솔(아이폰 Safari): 하단 공유버튼 ➡️ '홈 화면에 추가'")
    print("3. 오동원(안드로이드 Chrome): 상단 메뉴 ➡️ '앱 설치' 또는 '홈 화면에 추가'")
    print("=" * 65)

if __name__ == '__main__':
    main()
