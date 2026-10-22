@echo off
chcp 65001 > nul
title Couple Fit - GitHub 자동 업로드
python "%~dp0upload_to_github.py"
pause
