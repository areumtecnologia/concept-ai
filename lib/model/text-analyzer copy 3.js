const FileStorage = require('../db/file-storage');
const RedisStorage = require('../db/redis-storage');

class TextAnalyzer {
    constructor(options = {}) {
        this.wordCount = {};
        this.nextWordCount = {};
        this.bigramCount = {};
        this.trigramCount = {};
        this.vocabularySize = 0;
         this.preCalculatedProbabilities = {};
       this.minWordFrequency = options.minWordFrequency || 2;
        this.maxPrecalculatedSize = options.maxPrecalculatedSize || 5;
        this.storageType = options.storageType || 'file';
       if (this.storageType === 'redis') {
          this.storage = new RedisStorage({
                redisUrl: options.redisUrl,
                redisKey: options.redisKey,
            });
        } else {
            this.storage = new FileStorage(options.modelPath || 'model.json.gz');
        }
   }

    normalizeText(text) {
        return text
            .toLowerCase()
             .trim()
            .split(/\s+/);
    }

  async train(text) {
      console.log('\x1b[32m%s\x1b[0m', 'Treinamento iniciado!');
        console.log('\x1b[33m%s\x1b[0m', 'Normalizando texto...');
        const words = this.normalizeText(text);
        console.log('\x1b[33m%s\x1b[0m', 'Contando palavras...');
       const wordCounts = {};
       for (const word of words) {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
        console.log('\x1b[33m%s\x1b[0m', 'Filtrando palavras...');
       const filteredWords = words.filter(word => wordCounts[word] >= this.minWordFrequency);
        console.log('\x1b[33m%s\x1b[0m', 'Calculando probabilidades...');
        this.vocabularySize = new Set(filteredWords).size;
        for (let i = 0; i < filteredWords.length; i++) {
            const word = filteredWords[i];
           if (!this.wordCount[word]) {
                this.wordCount[word] = 0;
                this.nextWordCount[word] = {};
            }
            console.log(`Treinando palavra ${i + 1} de ${filteredWords.length}...`);
            this.wordCount[word]++;

             if (i < filteredWords.length - 1) {
                const nextWord = filteredWords[i + 1];
                const bigram = `${word} ${nextWord}`;

                 if (!this.nextWordCount[word][nextWord]) {
                    this.nextWordCount[word][nextWord] = 0;
                 }
                 console.log(`Treinando bigram ${i + 1} de ${filteredWords.length - 1}...`);
                 this.nextWordCount[word][nextWord]++;

                if (!this.bigramCount[bigram]) {
                    this.bigramCount[bigram] = 0;
                }
                this.bigramCount[bigram]++;
            }

           if (i < filteredWords.length - 2) {
              console.log(`Treinando trigram ${i + 1} de ${filteredWords.length - 2}...`);
                const nextWord = filteredWords[i + 1];
                const nextNextWord = filteredWords[i + 2];
                const trigram = `${word} ${nextWord} ${nextNextWord}`;
                if (!this.trigramCount[trigram]) {
                   this.trigramCount[trigram] = 0;
                }
                this.trigramCount[trigram]++;
            }
        }
       for (const word in this.wordCount) {
        console.log(`Calculando probabilidades para palavra "${word}"...`);
          this.preCalculatedProbabilities[word] = {
                bigrams: this.calculateNextWordProbability(word, true, false, this.maxPrecalculatedSize),
              trigrams: this.calculateNextWordProbability(word, false, true, this.maxPrecalculatedSize),
                unigrams: this.calculateNextWordProbability(word, false, false, this.maxPrecalculatedSize),
            };
        }
       console.log('\x1b[32m%s\x1b[0m', 'Treinamento concluído!');
  }

    calculateNextWordProbability(givenWord, useBigrams = true, useTrigrams = false, limit = null) {
        const normalizedGivenWord = givenWord.toLowerCase();
       let probabilities = [];
        let firstWord = ""
        let secondWord = ""
       const givenWords = normalizedGivenWord.split(" ")

      if(givenWords.length === 1){
           firstWord = givenWords[0];
       }else if(givenWords.length === 2) {
           firstWord = givenWords[0]
          secondWord = givenWords[1]
      } else if (givenWords.length >= 3){
         firstWord = givenWords[givenWords.length - 2];
         secondWord = givenWords[givenWords.length - 1]
     }
     if (useTrigrams && givenWords.length >= 2) {
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
      }
      else if (useBigrams && givenWords.length >= 1) {
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

    getMostProbableNextWord(givenWord, useBigrams = true, useTrigrams = false){
        const probabilities = this.calculateNextWordProbability(givenWord, useBigrams, useTrigrams);
        return this.getMostProbableNextWordByProbability(probabilities);
   }

   generateText(startText, maxLength = 20, useBigrams = true, useTrigrams = false) {
        const normalizedStartText = this.normalizeText(startText).join(' ');
        let currentWords = normalizedStartText.split(' ');
       let generatedText = [...currentWords];
       let previousWords = [];

        for (let i = 0; i < maxLength; i++) {
           let nextWord = null;
           const currentWord = currentWords.join(" ");
            const firstWord = currentWords[currentWords.length - 1];
           if(firstWord === ".")
                break;
            if (this.preCalculatedProbabilities[firstWord]) {
              let probabilities = [];
                if(useTrigrams){
                   probabilities = this.preCalculatedProbabilities[firstWord].trigrams;
               } else if (useBigrams) {
                   probabilities = this.preCalculatedProbabilities[firstWord].bigrams;
               } else {
                   probabilities = this.preCalculatedProbabilities[firstWord].unigrams;
               }
                 if(probabilities.length > 0){
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
                                      nextWord = p.word
                                       break;
                                   }
                             }
                       }
                 }
           } else {
             const probabilities = this.calculateNextWordProbability(currentWord, useBigrams, useTrigrams);
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
           }
            previousWords.push(nextWord);
            if(previousWords.length > 4){
                previousWords.shift();
            }

            generatedText.push(nextWord);

          if(useTrigrams && nextWord.split(' ').length > 1)
           {
              nextWord = nextWord.split(' ')[1];
           }
           currentWords.push(nextWord);
           if(currentWords.length > 4){
                currentWords.shift();
          }
        }
        return generatedText.join(' ');
    }

    async saveModel() {
      const modelData = {
          wordCount: this.wordCount,
            nextWordCount: this.nextWordCount,
          bigramCount: this.bigramCount,
          trigramCount: this.trigramCount,
            vocabularySize: this.vocabularySize,
         preCalculatedProbabilities: this.preCalculatedProbabilities,
       };
     await this.storage.save(modelData);
  }

   async loadModel() {
     const modelData = await this.storage.load();
      if(modelData){
          this.wordCount = modelData.wordCount;
          this.nextWordCount = modelData.nextWordCount;
         this.bigramCount = modelData.bigramCount;
           this.trigramCount = modelData.trigramCount;
           this.vocabularySize = modelData.vocabularySize;
          this.preCalculatedProbabilities = modelData.preCalculatedProbabilities;
       }
    }
}
module.exports = TextAnalyzer;