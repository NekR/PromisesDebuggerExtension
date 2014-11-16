rmdir .\chrome\shared
rmdir .\firefox\data\shared
rmdir .\worker\shared

cd .\chrome
mklink /D .\shared ..\shared
cd ..

cd .\firefox\data
mklink /D .\shared ..\..\shared
cd ..\..

cd .\worker
mklink /D .\shared ..\shared
cd ..