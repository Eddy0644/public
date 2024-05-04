// ==UserScript==
// @name         QiHang Education Video URL Fetcher
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  Fetch and decrypt video URLs from QiHang Education with bokecc.
// @author       Eddy0644
// @match        https://www.iqihang.com/ark/record/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';


    var observeRequests = function() {
        // Create a MutationObserver to observe script elements for changes
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                var addedNodes = mutation.addedNodes;
                addedNodes.forEach(function(node) {
                    if (node.tagName === 'SCRIPT' && node.src.includes('getvideofile')) {
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

        //console.log('Modified src:', newSrc);

        // Inject a floating container for feedback
        var container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.backgroundColor = 'white';
        container.style.padding = '20px';
        container.innerText = 'Parsing...';
        document.body.appendChild(container);

        // Fetch the modified URL and parse as JSON
        fetch(newSrc)
            .then(response => response.text())
            .then(data => {
            data=data.replace(/cc_jsonp_callback_([0-9]*?)\(/,"");
            data=data.substring(0,data.length-1);
                console.log('Fetched data:', data);
            data=JSON.parse(data);
                // Access the specific JSON path for the encoded URL
                let arr0=data.copies[0],flag=0;
                for(let arr1 of data.copies)if(arr1.quality==40){
                    flag=1;
                    let url=arr1.playurl;


                    // Change container to show a "Copy" button
                    container.innerHTML = '<button id="copyButton" onclick="document.a1()">Copy</button>';
                    var filename = document.querySelector('body > div > div.app-content > div > header').innerText;
                    window.cmdline=`start "" N_m3u8DL-CLI_v3.0.2.exe "${url}" --workDir "F:\Media_3" --saveName "${filename}" --minThreads "6" --retryCount "6" --stopSpeed "15" --enableDelAfterDone --noProxy`;
                    document.a1 = function() {
                        cmdline = prompt('Copy the commandline:', cmdline);
                        return;
                        prompt('Copy the name:', filename);

                        // Open the video URL for downloading
                        window.open(decodedUrl, '_blank');
                    };

                }
                if(flag==0) console.log(`Captured Data, but failed to get specific quality video link.`)
            return;

                var encodedString = data.data.play_info["1080p"].cdn_list[0].enc_url;
                if (encodedString) {
                    var decodedUrl = decryptVideo(encodedString);

                    // Change container to show a "Copy" button
                    container.innerHTML = '<button id="copyButton" onclick="document.a1()">Copy</button>';
                    //var filename = document.querySelector('body > div > div.app-content > div > header').innerText;
                    window.filename=filename;
                    window.decodedUrl=decodedUrl;
                    document.a1 = function() {
                        prompt('Copy the commandline:', cmdline);
                        return;
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
