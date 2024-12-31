class DataParser {
    constructor() {
    }

    /**
     * Parses the output of DataFetcher and returns text for training.
     * @param {Array<string> | string | {text: string | null, metadata: any} } data - The data output from DataFetcher.
     * @returns {string | null} - The parsed text string, or null if parsing fails.
     */
    parse(data) {
        if (!data) {
            return null;
        }

        if (typeof data === 'string') {
          return data;
        } else if (Array.isArray(data)) {
          return data.reduce((acc, curr) => acc + (curr || ""), "")
        } else if (typeof data === 'object' && data !== null && typeof data.text === 'string'){
          return data.text;
        }
        
        console.error("Invalid data format for parsing:", data);
        return null;
    }

    /**
     * Extracts text from an array of data objects
     * @param {Array<{text: string | null, metadata: any}>} dataArray - the result from the DataFetcher fetch or fetchDataFromSources
     * @returns {string} - The combined string of all text extracted.
     */
    extractTextFromDataArray(dataArray){
      if(!dataArray || !Array.isArray(dataArray)) return "";

      let combinedText = "";
        for (const data of dataArray) {
            if (data && data.text) {
                combinedText += data.text + '\n';
            }
        }
        return combinedText.trim();
    }
}

module.exports = DataParser;