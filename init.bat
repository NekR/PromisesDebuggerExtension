rmdir .\chrome\shared
rmdir .\firefox\data\shared

mklink /D .\chrome\shared .\shared
mklink /D .\firefox\data\shared .\shared