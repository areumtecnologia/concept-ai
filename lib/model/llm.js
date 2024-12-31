class LLM {
    constructor(){
    }
    
    calculateNextWordProbability(text, givenWord) {
        const words = text.split(/\s+/);
        const wordCount = {};
        const nextWordCount = {};

        for (let i = 0; i < words.length - 1; i++) {
            const word = words[i];
            const nextWord = words[i + 1];

            if (!wordCount[word]) {
                wordCount[word] = 0;
                nextWordCount[word] = {};
            }

            wordCount[word]++;
            if (!nextWordCount[word][nextWord]) {
                nextWordCount[word][nextWord] = 0;
            }
            nextWordCount[word][nextWord]++;
        }

        if (!wordCount[givenWord]) {
            return {};
        }

        const probabilities = {};
        const totalNextWords = wordCount[givenWord];
        const nextWords = nextWordCount[givenWord];

        for (const nextWord in nextWords) {
            probabilities[nextWord] = nextWords[nextWord] / totalNextWords;
        }

        return probabilities;
    }

    getMostProbableNextWord(probabilities) {
        let maxProbability = 0;
        let mostProbableWord = null;

        for (const word in probabilities) {
            if (probabilities[word] > maxProbability) {
                maxProbability = probabilities[word];
                mostProbableWord = word;
            }
        }

        return mostProbableWord;
    }

    getLeastProbableNextWord(probabilities) {
        let minProbability = 1;
        let leastProbableWord = null;

        for (const word in probabilities) {
            if (probabilities[word] < minProbability) {
                minProbability = probabilities[word];
                leastProbableWord = word;
            }
        }

        return leastProbableWord;
    }



}
module.exports = LLM;