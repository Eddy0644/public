// ==UserScript==
// @name         QiHang Education Video URL Fetcher
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  Fetch and decrypt video URLs from QiHang Education with bjcloudvod.
// @author       Eddy0644
// @match        https://www.iqihang.com/ark/record/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

var i = function (e, t) {
    var r = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var n = r.indexOf(e.charAt(t));
    if (-1 === n) throw "Cannot decode base64";
    return n
};
var decryptVideo = function(e) {
    if ("" === e || 0 !== e.indexOf("bjcloudvod://"))
        return "";
    var t = (e = e.slice("bjcloudvod://".length, e.length).replace(/-/g, "+").replace(/_/g, "/")).length % 4;
    2 === t ? e += "==" : 3 === t && (e += "=");
    var n = (e = bb(e)).charCodeAt(0) % 8;
    e = e.slice(1, e.length);
    for (var i, a = [], s = 0; i = e[s]; s++) {
        var o = s % 4 * n + s % 3 + 1;
        a.push(String.fromCharCode(i.charCodeAt(0) - o))
    }
    return a.join("").replace("https:", "").replace("http:", "")
};
var bb = function (e) {
    var t, n, r = 0,
        a = e.length,
        s = [];
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




    var observeRequests = function() {
        // Create a MutationObserver to observe script elements for changes
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                var addedNodes = mutation.addedNodes;
                addedNodes.forEach(function(node) {
                    if (node.tagName === 'SCRIPT' && node.src.includes('getPlayUrl')) {
                        console.log('Detected script:', node.src);
                        handleDetectedScript(node.src);
                    }
                });
            });
        });

        observer.observe(document, { childList: true, subtree: true });
    };

    var handleDetectedScript = function(src) {
        // Modify the src URL according to the new specifications
        var newSrc = src.replace("use_encrypt=1", "use_encrypt=0")
                        .replace("supports_format=mp4,mp4&", "supports_format=mp4&")
                        .replace("callback=__jp","cbcbcbc=_");

        console.log('Modified src:', newSrc);

        // Inject a floating container for feedback
        var container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.backgroundColor = 'white';
        container.style.padding = '10px';
        container.innerText = 'Parsing...';
        document.body.appendChild(container);

        // Fetch the modified URL and parse as JSON
        fetch(newSrc)
            .then(response => response.json())
            .then(data => {
                console.log('Fetched data:', data);
                // Access the specific JSON path for the encoded URL
                var encodedString = data.data.play_info["1080p"].cdn_list[0].enc_url;
                if (encodedString) {
                    var decodedUrl = decryptVideo(encodedString);

                    // Change container to show a "Copy" button
                    container.innerHTML = '<button id="copyButton" onclick="document.a1()">Copy</button>';
                    var filename = document.querySelector('body > div > div.app-content > div > header').innerText;
                    window.filename=filename;
                    window.decodedUrl=decodedUrl;
                    document.a1 = function() {
                        prompt('Copy the name:', filename);

                        // Open the video URL for downloading
                        window.open(decodedUrl, '_blank');
                    };
                    var downloadLink = document.createElement('a');
                    downloadLink.href = decodedUrl; // Set the href to the decoded video URL
                    downloadLink.download = filename; // Use the filename as the download attribute value
                    downloadLink.innerText = 'Download Video'; // Text displayed to the user
                    downloadLink.style.marginLeft = '10px'; // Add some spacing between the button and the link
                    container.appendChild(downloadLink); // Append the download link to the container

                } else {
                    console.error('Encoded string not found in the expected location.');
                    container.innerText = 'Error: Encoded string not found.';
                }
            })
            .catch(error => {
                console.error('Error fetching modified script:', error);
                container.innerText = 'Error fetching data.';
            });
    };

    observeRequests();










})();
