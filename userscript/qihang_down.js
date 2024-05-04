// ==UserScript==
// @name         QiHang Education Video URL Fetcher
// @namespace    http://tampermonkey.net/
// @version      2.1.0
// @description  Fetch and decrypt video URLs from QiHang Education with bokecc.
// @author       Eddy0644
// @match        https://www.iqihang.com/ark/record/*
// @grant        none
// ==/UserScript==

(function () {
    const m3u8DL_cmd = (url, name) => `start "" N_m3u8DL-CLI_v3.0.2.exe "${url}" --workDir "F:\Media_3" --saveName "${name}" --minThreads "6" --retryCount "6" --stopSpeed "15" --enableDelAfterDone --noProxy`;
    'use strict';
    const observeRequests = function () {
        // Create a MutationObserver to observe script elements for changes
        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                const addedNodes = mutation.addedNodes;
                addedNodes.forEach(function (node) {
                    if (node.tagName === 'SCRIPT' && node.src.includes('getvideofile')) {
                        console.log('Detected script:', node.src);
                        handleDetectedScript(node.src);
                    }
                });
            });
        });

        observer.observe(document, {childList: true, subtree: true});
    };

    const handleDetectedScript = function (src) {
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
              for (let arr1 of data.copies) if (arr1.quality == 40) {
                  flag = 1;
                  let url = arr1.playurl;

                  // Change container to show a "Copy" button
                  dl_container.innerHTML = '<button id="copyButton" onclick="document.fun1()">Copy</button>';
                  const filename = document.querySelector('body > div > div.app-content > div > header').innerText;
                  const out_name = filename.replace(".mp4", "");
                  window.cmdline = m3u8DL_cmd(url, out_name);

              }
              if (flag == 0) console.log(`Captured Data, but failed to get specific quality video link.`)
              return;

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
        cmdline = prompt('Copy the commandline:', cmdline);
    };
    observeRequests();

})();
