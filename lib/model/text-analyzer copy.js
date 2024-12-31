class TextAnalyzer {
    constructor(options = {}) {
        this.wordCount = {};
        this.nextWordCount = {};
        this.bigramCount = {};
        this.trigramCount = {};
        this.vocabularySize = 0;
         this.options = {
            nGramRange: options.nGramRange || [1, 2],
            randomness: options.randomness || 0.7,
            maxLength: options.maxLength || 20,
             ...options
        };
    }

  normalizeText(text) {
    return text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').trim().split(/\s+/);
  }

    train(text) {
        const words = this.normalizeText(text);
        this.vocabularySize = new Set(words).size;

        for (let i = 0; i < words.length; i++) {
            const word = words[i];

            if (!this.wordCount[word]) {
                this.wordCount[word] = 0;
                this.nextWordCount[word] = {};
            }
            this.wordCount[word]++;

            if (this.options.nGramRange.includes(2) && i < words.length - 1) {
                const nextWord = words[i + 1];
                const bigram = `${word} ${nextWord}`;

                if (!this.nextWordCount[word][nextWord]) {
                    this.nextWordCount[word][nextWord] = 0;
                }
                this.nextWordCount[word][nextWord]++;


                if (!this.bigramCount[bigram]) {
                  this.bigramCount[bigram] = 0;
                }
                this.bigramCount[bigram]++;

            }

            if (this.options.nGramRange.includes(3) && i < words.length - 2) {
                const nextWord = words[i + 1];
                const nextNextWord = words[i + 2];
                const trigram = `${word} ${nextWord} ${nextNextWord}`;
                 if (!this.trigramCount[trigram]) {
                    this.trigramCount[trigram] = 0;
                  }
                  this.trigramCount[trigram]++;
            }
        }
    }

    calculateNextWordProbability(givenWord, limit = null) {
        const normalizedGivenWord = givenWord.toLowerCase();
          let probabilities = [];
          let firstWord = ""
          let secondWord = ""
        const useBigrams = this.options.nGramRange.includes(2);
        const useTrigrams = this.options.nGramRange.includes(3);

          const givenWords = normalizedGivenWord.split(" ");

           if(givenWords.length === 1){
            firstWord = givenWords[0]
            } else if(givenWords.length === 2) {
                firstWord = givenWords[0]
                secondWord = givenWords[1]
           } else if (givenWords.length >= 3){
                firstWord = givenWords[givenWords.length - 2]
                secondWord = givenWords[givenWords.length - 1]
           }


         if (useTrigrams && givenWords.length > 1) {
              if (!this.wordCount[firstWord]) {
                 console.error(`Palavra "${firstWord}" não encontrada no vocabulário.`);
                  return [];
                 }
               const trigramToSearch = `${firstWord} ${secondWord}`
                for (const trigram in this.trigramCount) {
                      const [firstWordTrigram, secondWordTrigram, thirdWordTrigram] = trigram.split(' ');
                    if (trigramToSearch === `${firstWordTrigram} ${secondWordTrigram}`) {
                        const probability = (this.trigramCount[trigram] + 1) / (this.wordCount[firstWord] + this.vocabularySize);
                        probabilities.push({ word: thirdWordTrigram, probability, count: this.trigramCount[trigram] });
                   }
               }

             // Suavização de Laplace para palavras não vistas
            for(const word in this.wordCount){
                if(!probabilities.find(p => p.word === word)){
                    const probability = 1/(this.wordCount[firstWord] + this.vocabularySize);
                  probabilities.push({word, probability, count: 0})
                }
            }

          } else if (useBigrams && givenWords.length > 0) {
                if (!this.wordCount[firstWord]) {
                  console.error(`Palavra "${firstWord}" não encontrada no vocabulário.`);
                   return [];
                }
                for (const bigram in this.bigramCount) {
                      const [firstWordBigram, secondWordBigram] = bigram.split(' ');
                    if (firstWord === firstWordBigram) {
                       const probability = (this.bigramCount[bigram] + 1) / (this.wordCount[firstWord] + this.vocabularySize);
                        probabilities.push({ word: secondWordBigram, probability, count: this.bigramCount[bigram] });
                    }
                }
              // Suavização de Laplace para palavras não vistas
               for(const word in this.wordCount){
                  if(!probabilities.find(p => p.word === word)){
                       const probability = 1/(this.wordCount[firstWord] + this.vocabularySize);
                    probabilities.push({word, probability, count: 0})
                  }
               }

         }
         else {
                if (!this.wordCount[firstWord]) {
                   console.error(`Palavra "${firstWord}" não encontrada no vocabulário.`);
                   return [];
                }
                const totalNextWords = this.wordCount[firstWord];
                const nextWords = this.nextWordCount[firstWord];
               for (const nextWord in nextWords) {
                  const probability = (nextWords[nextWord] + 1) / (totalNextWords + this.vocabularySize);
                   probabilities.push({ word: nextWord, probability, count: nextWords[nextWord] });
              }
            // Suavização de Laplace para palavras não vistas
             for(const word in this.wordCount){
                 if(!probabilities.find(p => p.word === word)){
                     const probability = 1/(totalNextWords + this.vocabularySize);
                    probabilities.push({word, probability, count: 0})
                  }
             }
         }


         probabilities.sort((a, b) => b.probability - a.probability);
         if (limit) {
            return probabilities.slice(0, limit);
         } else {
            return probabilities;
         }
    }

    getMostProbableNextWordByProbability(probabilities) {
        if (!probabilities || probabilities.length === 0) {
            return null;
        }
        return probabilities[0].word;
    }

    getMostProbableNextWord(givenWord) {
        const probabilities = this.calculateNextWordProbability(givenWord);
        return this.getMostProbableNextWordByProbability(probabilities);
    }


    generateText(startText, maxLength = this.options.maxLength) {
      const normalizedStartText = this.normalizeText(startText).join(" ");
        let currentWords = normalizedStartText.split(' ');
        let generatedText = [...currentWords];
        let previousWords = [];

        for (let i = 0; i < maxLength; i++) {
            let nextWord = null;
            const probabilities = this.calculateNextWordProbability(currentWords.join(" "));
           if(!probabilities || probabilities.length === 0){
              break;
           }
            const filteredProbabilities = probabilities.filter(p => !previousWords.includes(p.word));
            if(filteredProbabilities.length === 0){
                nextWord = probabilities[0].word;
            } else {
                const sumOfProbabilities = filteredProbabilities.reduce((sum, p) => sum + p.probability, 0);
              const randomValue = Math.random() * sumOfProbabilities;
                 let cumulativeProbability = 0;
               for(const p of filteredProbabilities) {
                 cumulativeProbability += p.probability;
                  if(randomValue <= cumulativeProbability){
                       nextWord = p.word;
                      break;
                   }
              }
           }
            previousWords.push(nextWord);
            if (previousWords.length > 4) {
                 previousWords.shift()
           }
          generatedText.push(nextWord);
           if (this.options.nGramRange.includes(3) && nextWord.split(' ').length > 1) {
               nextWord = nextWord.split(' ')[1];
            }

          currentWords.push(nextWord);
          if(currentWords.length > 4){
            currentWords.shift()
          }

            if (nextWord === ".")
               break;
        }
       return generatedText.join(' ');
    }


    inference(startWord, maxLength = this.options.maxLength) {
        let sentence = startWord;
        let currentWord = startWord;
        for (let i = 0; i < maxLength; i++) {
            const nextWord = this.getMostProbableNextWord(currentWord);
            if (!nextWord) {
              break;
            }
            sentence += ' ' + nextWord;
            currentWord = nextWord;
        }

        return sentence;
    }
}

module.exports = TextAnalyzer;