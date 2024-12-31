const fs = require('fs');
const pdfParse = require('pdf-parse');
const csvParse = require('csv-parse');
const { JSDOM } = require('jsdom');
const path = require('path');

class DataFetcher {
    constructor(options = {}) {
        this.options = {
            encoding: options.encoding || 'utf-8',
            csvDelimiter: options.csvDelimiter || ',',
            cache: new Map(),
            ...options,
        };
        this.recursiveUrls = [];
    }

    async fetch(input, levels = 1, maxRecursiveLinks = 10) {
        let allText = { text: "", metadata: {} };
        if (typeof input === 'string') {
            // Assuming input is a file path or URL
            if (input.startsWith("http://") || input.startsWith("https://")) {
              allText = await this.fetchTextFromWebsiteRecursive(input, levels, maxRecursiveLinks);
            } else {
                allText = await this.fromFile(input);
            }
        } else if (Array.isArray(input)) {
            const results = await Promise.all(input.map(async item => {
                 if (item.startsWith("http://") || item.startsWith("https://")) {
                   return await this.fetchTextFromWebsiteRecursive(item, levels, maxRecursiveLinks);
                 } else {
                     return await this.fromFile(item);
                 }
            }));
            allText.text = results.reduce((acc, curr) => acc + (curr.text || ""), "")
            allText.metadata = results.reduce((acc, curr) => ({ ...acc, ...(curr.metadata || {})}), {})
        } else {
            console.error("Invalid input type");
            return { text: null, metadata: null }
        }
        return allText;
    }

    async fetchTextFromFile(filePath) {
        try {
            const data = await fs.promises.readFile(filePath, this.options.encoding);
             console.log(`Texto carregado do arquivo: ${filePath}`);
            return { text: data, metadata: { filePath } };
        } catch (error) {
            console.error(`Erro ao ler o arquivo de texto ${filePath}:`, error);
            return { text: null, metadata: { error } };
        }
    }

    async fetchTextFromPdf(filePath) {
         try {
            const dataBuffer = await fs.promises.readFile(filePath);
            const pdfData = await pdfParse(dataBuffer);
             console.log(`Texto carregado do PDF: ${filePath}`);
            return { text: pdfData.text, metadata: { ...pdfData.metadata, filePath } };
        } catch (error) {
            console.error(`Erro ao ler o arquivo PDF ${filePath}:`, error);
            return { text: null, metadata: { error } };
        }
    }

     async fetchTextFromWebsite(url) {
         if (this.options.cache.has(url)) {
             console.log(`Texto carregado do cache: ${url}`);
            return this.options.cache.get(url);
        }
       try {
            const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                 throw new Error(`Erro ao acessar a URL ${url}: Status ${response.status}`);
            }

            const html = await response.text();
            const dom = new JSDOM(html);
            const document = dom.window.document;

            let textContent = '';
            const elements = document.querySelectorAll('p');
            elements.forEach(el => {
                textContent += el.textContent + '\n';
            });

            if (!textContent) {
                textContent = document.body ? document.body.textContent : '';
            }

            textContent = textContent.replace(/\s+/g, ' ').trim();
            textContent = textContent.replace(/([\.#a-zA-Z][\w\-\s\>:\.\(\)\*\[\]="'~^$|%]+)\s*\{[\s\S]*?\}/g, '').trim(); // Remove CSS rules
            textContent = textContent.replace(/<[^>]*>?/gm, '');
            //textContent = textContent.replace(/\[\d+\]/g, ''); // Remove reference links

            const result = { text: textContent, metadata: { url } };
            this.options.cache.set(url, result);
            console.log(`Texto carregado do website: ${url}`);
           return result;

        } catch (error) {
            console.error(`Erro ao buscar dados do website ${url}:`, error);
             return { text: null, metadata: { error } };
        }
    }


    async fromFile(filePath) {
        const extension = path.extname(filePath).toLowerCase();
          try {
            if (extension === '.txt') {
                return await this.fetchTextFromFile(filePath);
            } else if (extension === '.csv') {
                  const csvData = await fs.promises.readFile(filePath, this.options.encoding);
                const records = await csvParse(csvData, {
                    columns: true,
                    delimiter: this.options.csvDelimiter
                });
                 return { text: JSON.stringify(records), metadata: { filePath, type: 'csv'} }

            } else if (extension === '.pdf') {
                return await this.fetchTextFromPdf(filePath);
            }
            throw new Error(`Formato de arquivo não suportado: ${extension}`);

        } catch (err) {
            console.error(`Erro ao ler arquivo ${filePath}:`, err)
          return { text: null, metadata: { error: err } };
        }
    }
    async fetchJsonDataset(filePath) {
         try {
            const data = await fs.promises.readFile(filePath, 'utf-8');
            const jsonData = JSON.parse(data);
             console.log(`Dataset JSON carregado do arquivo: ${filePath}`);
            return { text: JSON.stringify(jsonData), metadata: { filePath, type: 'json'} };
        } catch (error) {
            console.error(`Erro ao ler ou analisar o arquivo JSON ${filePath}:`, error);
             return { text: null, metadata: { error } };
        }
    }

     async fetchDataFromSources(sources) {
         const results = await Promise.all(sources.map(async (source) => {
            let result = { text: null, metadata: {}};

            if (source.type === 'file') {
                 result = await this.fetchTextFromFile(source.source);
            } else if (source.type === 'pdf') {
               result =  await this.fetchTextFromPdf(source.source);
            } else if (source.type === 'web') {
                result = await this.fetchTextFromWebsite(source.source);
            } else {
                console.warn(`Tipo de fonte desconhecido: ${source.type}`);
            }
            return result
        }));
        return results.reduce((acc, curr) => ({
            text: acc.text + (curr.text || ""),
            metadata: { ...acc.metadata, ...(curr.metadata || {}) },
         }), {text: "", metadata:{}})
     }

    async fetchTextFromWebsiteRecursive(url, depth = 1, maxLinks = 10, currentLinkCount = 0) {
        if (depth < 0 || currentLinkCount >= maxLinks) {
            return { text: '', metadata: {} };
        }

         try {
            const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);


            if (!response.ok) {
                throw new Error(`Erro ao acessar a URL ${url}: Status ${response.status}`);
            }
            const html = await response.text();
            const dom = new JSDOM(html);
            const document = dom.window.document;

            let textContent = '';
            const elements = document.querySelectorAll('p');
            elements.forEach(el => {
                textContent += el.textContent + '\n';
            });

             if (!textContent) {
                textContent = document.body ? document.body.textContent : '';
            }
            textContent = textContent.replace(/\s+/g, ' ').trim();
            if(depth > 0) {
                // Recursively fetch text from links
                const links = document.querySelectorAll('a[href]');
                let recursiveTexts = "";
                for (const link of links) {
                    const href = link.href;
                    if (href.startsWith('http://') || href.startsWith('https://')) {
                    const foundUrl = this.recursiveUrls.find(u => u === href);
                    if (!foundUrl && currentLinkCount < maxLinks) {
                            const result = await this.fetchTextFromWebsiteRecursive(href, depth - 1, maxLinks, currentLinkCount + 1);
                            recursiveTexts += result.text;
                            this.recursiveUrls.push(href);
                            currentLinkCount++;
                            console.log(`Texto carregado recursivamente do website: ${href}`);
                        } else if (currentLinkCount >= maxLinks){
                            console.log(`Limite de links recursivos atingido: ${maxLinks}`);
                            break;
                        }
                    }
                }
                return { text: `${textContent} ${recursiveTexts}`, metadata: { url }};

            }            

            console.log(`Texto carregado do website: ${url}`);
            return { text: textContent, metadata: { url }};

        } catch (error) {
            console.error(`Erro ao buscar dados do website ${url}:`, error);
            return { text: null, metadata: { error } };
        }
    }
}
module.exports = DataFetcher;