@echo off
echo Pushing to GitHub...
echo.

REM Remove old remote
git remote remove origin

REM Add new remote (CHANGE THIS to your GitHub username and repo name!)
git remote add origin https://github.com/dmbpolly-a11y/digtech-academy.git

REM Push to GitHub
git branch -M main
git push -u origin main

echo.
echo Done! Check your GitHub repository.
pause
