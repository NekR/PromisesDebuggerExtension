rmdir .\chrome\shared
rmdir .\firefox\data\shared

cd .\chrome
mklink /D .\shared ..\shared
cd ..
cd .\firefox\data
mklink /D .\shared ..\..\shared
cd ..\..