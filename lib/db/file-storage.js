const fs = require('fs').promises;
const zlib = require('zlib');

class FileStorage {
    constructor(modelPath) {
      this.modelPath = modelPath;
  }

   async save(modelData) {
        try {
             const compressed = zlib.gzipSync(JSON.stringify(modelData));
            await fs.writeFile(this.modelPath, compressed);
              console.log('\x1b[33m%s\x1b[0m', `Modelo salvo em: ${this.modelPath}`);
        } catch (error) {
           console.error('Erro ao salvar o modelo:', error);
        }
    }

   async load() {
        try {
           await fs.access(this.modelPath);
              const compressed = await fs.readFile(this.modelPath);
             const uncompressed = zlib.gunzipSync(compressed);
               return JSON.parse(uncompressed.toString());
         } catch (error) {
           console.log("Nenhum modelo encontrado. Iniciando do zero.", error)
            return null;
         }
    }
}

module.exports = FileStorage;