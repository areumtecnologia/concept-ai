class ConsoleAnimator {
    constructor() {
       this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
       this.frameIndex = 0;
       this.intervalId = null;
    }
  
  
    start(message) {
          this.stop();
        this.intervalId = setInterval(() => {
              process.stdout.clearLine();
              process.stdout.cursorTo(0);
             process.stdout.write(`\x1b[36m${this.frames[this.frameIndex]} \x1b[0m${message}`);
              this.frameIndex = (this.frameIndex + 1) % this.frames.length;
        }, 100);
         return this.intervalId
    }
  
    stop() {
      if(this.intervalId){
          clearInterval(this.intervalId);
           process.stdout.clearLine();
           process.stdout.cursorTo(0);
      }
    }
  }
  module.exports = ConsoleAnimator;