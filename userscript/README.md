## qihang_down.js

I've bought recorded videos on iqihang.com, and I want to download them to localhost and watch with PotPlayer, which means I could use self-defined hotkeys😋.
So I looked into the page, found that it used baijiayun.com service to host video. 

Here explains how the video is loaded:
  - First the page get course list from iqihang, then use course-id (I forgot actual name) and session data to get `uid` and `token`, which is required for baijiayun APIs.
  - Then, the page used JSONP to get `playUrl` data from baijiayun API, whose response contains an encoded `bjcloudvod://` link.
  - Next, the script decoded it, acquire actual video data, and play through `bplayer`, a player created by bjcloud.

After that, I found that the parameters inside `getPlayUrl` request can be edited, to disable encryption, set supported_video_format to mp4 only, so that I could open the video in browser directly or download.

That's why this script is created. 
To use, you should install a plugin (like `TamperMonkey`) to enable the use of userscripts, then paste my script inside, then open one of iqihang video page. 
A floating container will display on the top-right corner of page. After the `Parsing...` hint disappeared, you can click on `Copy` button, and copy the filename in prompt box, click confirm, and press Ctrl+S in newly-opened video link, and paste the actual filename on download dialog. These operations can be done quickly if you are familiar with it. Thanks.
