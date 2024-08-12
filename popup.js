document.getElementById('extractCode').addEventListener('click', async () => {
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');

    loadingMessage.style.display = 'block';
    errorMessage.style.display = 'none';

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Extract the website name (hostname) from the URL
        const websiteName = new URL(tab.url).hostname;

        // Execute script to get the HTML content of the page
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: extractPageContent
        }, async (results) => {
            if (results && results[0] && results[0].result) {
                const htmlContent = results[0].result;
                const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
                const baseUrl = new URL(tab.url);
                const resources = resolveResourceLinks(doc, baseUrl);

                const zip = new JSZip();
                const folder = zip.folder(websiteName);

                // Add the html to the zip file
                folder.file("index.html", new XMLSerializer().serializeToString(doc));

                // Fetch n add resources
                await Promise.all(resources.map(async resource => {
                    try {
                        const response = await fetch(resource.url);
                        const data = await response.blob();
                        folder.file(resource.path, data);
                    } catch (error) {
                        console.error(`Failed to fetch resource: ${resource.url}`, error);
                    }
                }));

                // Generate the zip file and trigger download
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
    return document.documentElement.outerHTML;
}

function resolveResourceLinks(doc, baseUrl) {
    const resources = [];
    const elements = doc.querySelectorAll('link[href], script[src], img[src]');

    elements.forEach(element => {
        const attr = element.tagName === 'LINK' || element.tagName === 'IMG' ? 'href' : 'src';
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
