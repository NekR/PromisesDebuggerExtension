# Promises Debugger Extension

## Hello

Promises Debugger Extension allow you debug native Promises (ES6) right now in current and higher versions of Chrome and Firefox.

Please see video for details. Extension is in really early version, but soon it will have more features.

## Video

<a href="http://www.youtube.com/watch?feature=player_embedded&v=u4V1ldBKd2M
" target="_blank"><img src="http://img.youtube.com/vi/u4V1ldBKd2M/0.jpg" 
alt="IMAGE ALT TEXT HERE" width="320" height="220" border="10" /></a>

## How to use

* First you need to run ```init.bat``` if you are on Window, or ```init.sh``` if you are on Linux/OS X
* To run Firefox extension you should have Addons-SDK installed, then go to ```firefox``` subfolder and run ```cfx run```
* To run Chrome extension, just load it as an unpacket extension from subfolder ```chrome```

__**Note:** Doesn't catch Promise errors from scripts which are produced before document is completely parsed.
By some reason scripts cannot be injected before it, at least in Chrome.