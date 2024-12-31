const DataFetcher = require('./lib/utils/data-fetcher');
const DataParser = require('./lib/utils/data-parser');
const TextAnalyzer = require('./lib/model/text-analyzer');
const readline = require('readline');

const main = async () => {
    const textAnalyzer = new TextAnalyzer();
    const dataFetcher = new DataFetcher();
    const parser = new DataParser();

        // Tentar carregar o modelo
    await textAnalyzer.loadModel();
        // Verificar se o modelo foi carregado
    if (Object.keys(textAnalyzer.wordCount).length === 0) {
        console.log("Modelo não encontrado. Iniciando coleta de dados...");
        const datatext = await dataFetcher.fetch([
            'https://www.dicio.com.br/'
        ], 5);

        // const datatext = await dataFetcher.fetchTextFromPdf('./datasets/alice-no-pais-das-maravilhas.pdf')
        // return console.log(datatext)
        console.log("Dados carregados. Parseando...");
        const context = parser.parse(datatext);

        console.log("Iniciando treinamento...");
        textAnalyzer.train(context);

        console.log("Treinanamento finalizado. Salvando o modelo...");
        // Salvar o modelo após o treinamento
        await textAnalyzer.saveModel();
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const askQuestion = () => {
        rl.question(
            'Digite a frase inicial (ou "sair" para encerrar):\n',
            async (startText) => {
                
                if (startText.toLowerCase() === 'sair') {
                    rl.close();
                    return;
                }

                let generatedText = textAnalyzer.generateText(startText, 20, false, false);
                console.log('Frase gerada (unigrama):', generatedText);

                generatedText = textAnalyzer.generateText(startText, 20, true, false);
                console.log('Frase gerada (bigrama):', generatedText);

                generatedText = textAnalyzer.generateText(startText, 20, true, true);
                console.log('Frase gerada (trigrama):', generatedText);

                askQuestion();
            },
        );
    };
    askQuestion();
};

main();