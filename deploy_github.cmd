@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === 台南しおり GitHub Pages 公開 === > deploy_log.txt
echo 作業フォルダ: %CD% >> deploy_log.txt
where gh >> deploy_log.txt 2>&1
where git >> deploy_log.txt 2>&1
git add -A >> deploy_log.txt 2>&1
git -c user.name="Yuki Kondo" -c user.email="hakuchiyo@gmail.com" commit -m "update" >> deploy_log.txt 2>&1
gh repo view konta1991/tainan2026 >nul 2>&1
if errorlevel 1 goto create
echo [push] 既存リポジトリへ push >> deploy_log.txt
git push -u origin main >> deploy_log.txt 2>&1
goto done
:create
echo [1/2] リポジトリ作成と push >> deploy_log.txt
gh repo create tainan2026 --public --source=. --push --description "台南 2026.8.29-31 旅のしおり" >> deploy_log.txt 2>&1
echo [2/2] Pages 有効化 >> deploy_log.txt
gh api -X POST repos/konta1991/tainan2026/pages -f build_type=legacy -f "source[branch]=main" -f "source[path]=/" >> deploy_log.txt 2>&1
:done
echo 公開URL: https://konta1991.github.io/tainan2026/ >> deploy_log.txt
type deploy_log.txt
echo.
echo 上の内容は deploy_log.txt にも保存しました。何かキーを押すと閉じます。
pause >nul
