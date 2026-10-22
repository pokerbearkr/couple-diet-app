@echo off
chcp 65001 > nul
title Couple Fit - GitHub 원클릭 자동 배포기

set "PATH=C:\Program Files\Git\cmd;C:\Program Files\GitHub CLI;%PATH%"

echo ================================================================
echo 💑 [Couple Fit] Git ^& GitHub CLI 원클릭 자동 배포를 시작합니다!
echo ================================================================
echo.

cd /d "%~dp0"

echo 1단계: GitHub 로그인 상태 확인 중...
gh auth status > nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo 🔑 GitHub 로그인이 필요합니다.
    echo 잠시 후 웹 브라우저가 열리면 [Authorize github] 버튼을 클릭해주세요!
    echo.
    gh auth login -w -p https -h github.com
)

echo.
echo 2단계: 최신 소스코드 Git 커밋 중...
git add .
git commit -m "Update: Couple Fit app for Dongwon & Haesol" > nul 2>&1
git branch -M main

echo.
echo 3단계: GitHub에 'couple-diet-app' 저장소 생성 및 푸시 중...
gh repo create couple-diet-app --public --source=. --remote=origin --push > nul 2>&1
if %errorlevel% neq 0 (
    echo 기존 저장소에 최신 변경사항을 푸시합니다...
    git push -u origin main
)

echo.
echo 4단계: 무료 웹사이트(GitHub Pages) 자동 활성화 중...
gh api --silent -X POST repos/:owner/couple-diet-app/pages -f source="{\"branch\":\"main\",\"path\":\"/\"}" > nul 2>&1

echo.
echo ================================================================
echo 🎉 GitHub 자동 업로드 및 배포가 완료되었습니다!
echo.
echo 내 GitHub 저장소 확인:
gh repo view --web
echo ================================================================
echo.
pause
