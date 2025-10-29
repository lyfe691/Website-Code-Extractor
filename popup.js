// Author: Yanis Sebastian Zürcher
// https://ysz.life

document.getElementById('extractCode').addEventListener('click', async () => {
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');

    loadingMessage.style.display = 'block';
    errorMessage.style.display = 'none';

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // extract the website name from the URL
        const websiteName = new URL(tab.url).hostname;

        // execute script to get the html content of the page
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: extractPageContent
        }, async (results) => {
            if (results && results[0] && results[0].result) {
                const { html: htmlContent, doctype } = results[0].result;
                const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
                const baseUrl = new URL(tab.url);
                const resources = resolveResourceLinks(doc, baseUrl);

                const zip = new JSZip();
                const folder = zip.folder(websiteName);

                // add the html to the zip file
                folder.file("index.html", new XMLSerializer().serializeToString(doc));

                // fetch n add resources
                await Promise.all(resources.map(async resource => {
                    try {
                        const response = await fetch(resource.url);
                        const data = await response.blob();
                        folder.file(resource.path, data);
                    } catch (error) {
                        console.error(`Failed to fetch resource: ${resource.url}`, error);
                    }
                }));

                // generate the zip file and trigger download
                zip.generateAsync({ type: "blob" }).then(function(content) {
                    chrome.downloads.download({
                        url: URL.createObjectURL(content),
                        filename: `${websiteName}.zip`,
                        saveAs: true
                    });

                    loadingMessage.style.display = 'none';
                }).catch(error => {
                    console.error("Failed to generate zip file:", error);
                    loadingMessage.style.display = 'none';
                    errorMessage.style.display = 'block';
                });
            } else {
                throw new Error("Failed to extract page content.");
            }
        });
    } catch (error) {
        console.error("An error occurred:", error);
        loadingMessage.style.display = 'none';
        errorMessage.style.display = 'block';
    }
});

function extractPageContent() {
    const doctype = document.doctype
    ? new XMLSerializer().serializeToString(document.doctype)
    : null;

    return {
        html: document.documentElement.outerHTML,
        doctype,
    };
}

function resolveResourceLinks(doc, baseUrl) {
    const resources = [];
    const elements = doc.querySelectorAll('link[href], script[src], img[src]');

    elements.forEach(element => {
        let attr;
        if (element.tagName === 'LINK') {
            attr = 'href';
        } else if (element.tagName === 'IMG' || element.tagName === 'SCRIPT') {
            attr = 'src';
        } else {
            attr = element.hasAttribute('src') ? 'src' : 'href';
        }
        let url = element.getAttribute(attr);
        if (url) {
            if (!url.startsWith('http')) {
                url = new URL(url, baseUrl).href;
            }
            const urlObject = new URL(url);
            let path = urlObject.hostname + urlObject.pathname;

            path = path.startsWith('/') ? path.substr(1) : path;
            path = path.replace(/\//g, '/');

            resources.push({ url, path });
            element.setAttribute(attr, path);
        }
    });

    return resources;
}
