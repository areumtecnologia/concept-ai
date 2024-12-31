const redis = require('redis');

class RedisStorage {
    constructor(options) {
      this.redisClient = redis.createClient({
             url: options.redisUrl || 'redis://localhost:6379'
          });
        this.redisClient.on('error', (err) => console.log('Redis Client Error', err));
      this.redisKey = options.redisKey || 'textAnalyzerModel';
         this.isReady = false;
    }

    async save(modelData) {
        try {
          if(!this.isReady){
                await this.redisClient.connect();
             this.isReady = true;
          }
           await this.redisClient.set(this.redisKey, JSON.stringify(modelData));
          console.log('\x1b[33m%s\x1b[0m', `Modelo salvo no Redis com a chave: ${this.redisKey}`);
        } catch (error) {
            console.error('Erro ao salvar o modelo no Redis:', error);
        }
    }

    async load() {
        try {
          if(!this.isReady){
              await this.redisClient.connect();
               this.isReady = true;
           }
          const modelData = await this.redisClient.get(this.redisKey);
             if(modelData){
                 console.log('\x1b[33m%s\x1b[0m', `Modelo carregado do Redis com a chave: ${this.redisKey}`);
                 return JSON.parse(modelData);
             } else {
              console.log("Nenhum modelo encontrado no Redis. Iniciando do zero.");
                return null;
            }
         } catch (error) {
           console.log("Nenhum modelo encontrado no Redis. Iniciando do zero.", error)
          return null;
        }
    }
}
module.exports = RedisStorage;