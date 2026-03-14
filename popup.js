// Author: Yanis Sebastian Zürcher
// https://ysz.life

document.getElementById('year').textContent = new Date().getFullYear();

document.getElementById('extractCode').addEventListener('click', async () => {
    const button = document.getElementById('extractCode');
    const errorMessage = document.getElementById('errorMessage');

    if (button.disabled) return;
    button.disabled = true;
    button.textContent = 'Extracting...';
    errorMessage.style.display = 'none';

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // block privileged pages that can't be scripted
        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
            throw new Error("Cannot extract code from this page.");
        }

        // extract the website name from the URL
        const websiteName = new URL(tab.url).hostname;

        // execute script to get the html content of the page
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: extractPageContent
        });

        if (results && results[0] && results[0].result) {
            const { html: htmlContent, doctype } = results[0].result;
            const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
            const baseUrl = new URL(tab.url);
            const resources = resolveResourceLinks(doc, baseUrl);

            const zip = new JSZip();
            const folder = zip.folder(websiteName);

            // add the html to the zip file, with doctype prepended
            const serializedHtml = new XMLSerializer().serializeToString(doc);
            const fullHtml = doctype ? doctype + '\n' + serializedHtml : serializedHtml;
            folder.file("index.html", fullHtml);

            // fetch and add resources
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
            const content = await zip.generateAsync({ type: "blob" });
            const blobUrl = URL.createObjectURL(content);
            await chrome.downloads.download({
                url: blobUrl,
                filename: `${websiteName}.zip`,
                saveAs: true
            });
            URL.revokeObjectURL(blobUrl);

            button.textContent = 'Extract & Download';
            button.disabled = false;
        } else {
            throw new Error("Failed to extract page content.");
        }
    } catch (error) {
        console.error("An error occurred:", error);
        errorMessage.style.display = 'block';
    } finally {
        button.textContent = 'Extract & Download';
        button.disabled = false;
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

            path = path.startsWith('/') ? path.slice(1) : path;
            path = path.replace(/\/\//g, '/');

            resources.push({ url, path });
            element.setAttribute(attr, path);
        }
    });

    return resources;
}
