// ==UserScript==
// @name         QiHang Education Video URL Fetcher
// @namespace    http://tampermonkey.net/
// @version      2.2.0
// @description  Fetch and decrypt video URLs from QiHang Education with bjcloudvod and bokecc.
// @author       Eddy0644
// @match        https://www.iqihang.com/ark/record/*
// @grant        none
// ==/UserScript==

(function () {
    const bb = function (e) {
        let t, n, r = 0,
          a = e.length;
        const s = [];
        if (e = String(e), 0 === a) return e;
        if (a % 4 != 0) throw "Cannot decode base64";
        for ("=" === e.charAt(a - 1) && (r = 1, "=" === e.charAt(a - 2) && (r = 2), a -= 4), t = 0; t <
        a; t += 4) n = i(e, t) << 18 | i(e, t + 1) << 12 | i(e, t + 2) << 6 | i(e, t + 3), s.push(
          String.fromCharCode(n >> 16, n >> 8 & 255, 255 & n));
        switch (r) {
            case 1:
                n = i(e, t) << 18 | i(e, t + 1) << 12 | i(e, t + 2) << 6, s.push(String.fromCharCode(
                  n >> 16, n >> 8 & 255));
                break;
            case 2:
                n = i(e, t) << 18 | i(e, t + 1) << 12, s.push(String.fromCharCode(n >> 16))
        }
        return s.join("")
    };
    const decryptVideo = function (e) {
        if ("" === e || 0 !== e.indexOf("bjcloudvod://"))
            return "";
        const t = (e = e.slice("bjcloudvod://".length, e.length).replace(/-/g, "+").replace(/_/g, "/")).length % 4;
        2 === t ? e += "==" : 3 === t && (e += "=");
        const n = (e = bb(e)).charCodeAt(0) % 8;
        e = e.slice(1, e.length);
        for (var i, a = [], s = 0; i = e[s]; s++) {
            const o = s % 4 * n + s % 3 + 1;
            a.push(String.fromCharCode(i.charCodeAt(0) - o))
        }
        return a.join("").replace("https:", "").replace("http:", "")
    };
    const m3u8DL_cmd = (url, name) => `start "" N_m3u8DL-CLI_v3.0.2.exe "${url}" --workDir "F:\Media_3" --saveName "${name}" --minThreads "6" --retryCount "6" --stopSpeed "15" --enableDelAfterDone --noProxy`;
    const curl_cmd = (url, name) => `start "" curl -o "F:\\Media_3\\${name}" "${url}"`;
    'use strict';
    const observeRequests = function () {
        // Create a MutationObserver to observe script elements for changes
        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                const addedNodes = mutation.addedNodes;
                addedNodes.forEach(function (node) {
                    if (node.tagName === 'SCRIPT' && node.src.includes('getvideofile')) {
                        console.log('Detected script:', node.src);
                        handleDetectedScript_bokecc(node.src);
                    }
                    if (node.tagName === 'SCRIPT' && node.src.includes('getPlayUrl')) {
                        console.log('Detected script:', node.src);
                        handleDetectedScript_bjcloud(node.src);
                    }
                });
            });
        });

        observer.observe(document, {childList: true, subtree: true});
    };

    const handleDetectedScript_bokecc = function (src) {
        // Modify the src URL according to the new specifications
        // var newSrc = src.replace("use_encrypt=1", "use_encrypt=0")
        //   .replace("supports_format=mp4,mp4&", "supports_format=mp4&")
        //   .replace("callback=__jp", "cbcbcbc=_");
        const newSrc = src;
        //console.log('Modified src:', newSrc);

        // Inject a floating container for feedback
        if (!window.dl_container) {
            window.dl_container = document.createElement('div');
            dl_container.style.position = 'fixed';
            dl_container.style.top = '20px';
            dl_container.style.right = '20px';
            dl_container.style.backgroundColor = 'white';
            dl_container.style.padding = '20px';
            dl_container.innerText = 'Parsing...';
            document.body.appendChild(dl_container);
        } else dl_container.innerText = 'Parsing...';

        // Fetch the modified URL and parse as JSON
        fetch(newSrc)
          .then(response => response.text())
          .then(data => {
              data = data.replace(/cc_jsonp_callback_([0-9]*?)\(/, "");
              data = data.substring(0, data.length - 1);
              console.log('Fetched data:', data);
              data = JSON.parse(data);
              let flag = 0;
              for (let arr1 of data.copies) if (arr1.quality === 40) {
                  flag = 1;
                  let url = arr1.playurl;

                  // Change container to show a "Copy" button
                  dl_container.innerHTML = '<button id="copyButton" onclick="document.fun1()">Copy</button>';
                  const filename = document.querySelector('body > div > div.app-content > div > header').innerText;
                  const out_name = filename.replace(".mp4", "");
                  window.cmdline = m3u8DL_cmd(url, out_name);

              }
              if (flag === 0) console.log(`Captured Data, but failed to get specific quality video link.`)


          });

    };
    const handleDetectedScript_bjcloud = function (src) {
        // Modify the src URL according to the new specifications
        const newSrc = src.replace("use_encrypt=1", "use_encrypt=0")
          .replace("supports_format=mp4,mp4&", "supports_format=mp4&")
          .replace("callback=__jp", "cbcbcbc=_");
        console.log('Modified src:', newSrc);

        // Inject a floating container for feedback
        if (!window.dl_container) {
            window.dl_container = document.createElement('div');
            dl_container.style.position = 'fixed';
            dl_container.style.top = '20px';
            dl_container.style.right = '20px';
            dl_container.style.backgroundColor = 'white';
            dl_container.style.padding = '20px';
            dl_container.innerText = 'Parsing...';
            document.body.appendChild(dl_container);
        } else dl_container.innerText = 'Parsing...';

        // Fetch the modified URL and parse as JSON
        fetch(newSrc)
          .then(response => response.json())
          .then(data => {
              const url = decryptVideo(data.data.play_info["1080p"].cdn_list[0].enc_url);
              // Change container to show a "Copy" button
              dl_container.innerHTML = '<button id="copyButton" onclick="document.fun1()">Copy</button>';
              const filename = document.querySelector('body > div > div.app-content > div > header').innerText;
              // const out_name = filename.replace(".mp4", "");
              window.cmdline = curl_cmd("https:" + url, filename);

          });

    };
    document.fun1 = function () {
        // First, pause video
        document.getElementsByTagName("video")[0].pause();
        setTimeout(() => {
            document.getElementsByTagName("video")[0].pause();
        }, 2000);
        navigator.clipboard.writeText(cmdline).then(function () {
            console.log('Commandline Written to Clipboard:', cmdline);
            dl_container.innerHTML = '<button id="copyButton" onclick="document.fun2()">[Copied to clipboard]</button>';

        });
    };
    document.fun2 = function () {
        window.cmdline = prompt('Copy the commandline:', cmdline);
    };
    document.fun3 = function () {
        window.cmdline = prompt('Copy the commandline:', cmdline);
    };


    let i = function (e, t) {
        const r = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        const n = r.indexOf(e.charAt(t));
        if (-1 === n) throw "Cannot decode base64";
        return n
    };

    observeRequests();

})();
