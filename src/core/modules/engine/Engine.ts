import EngineProcess from './EngineProcess.ts';
import { preferenceConfig } from '../../../config.ts';

interface EngineOptions {
  duration: number;
  multiPV: number;
  threads: number;
}

const optionNames: Partial<Record<keyof EngineOptions, string>> = {
  multiPV: 'MultiPV',
  threads: 'Threads'
};

function getNumberValue(words: string[], name: string): number {
  return Number(words[words.indexOf(name)+1]);
}

class Engine {
  private process: EngineProcess | null = null;
  private loadingProcess: EngineProcess | null = null;
  private processLock: Promise<void> = Promise.resolve();
  private optionLocks: Partial<Record<keyof EngineOptions, Promise<void>>> = {};
  private moves: string[] = [];
  private whiteFirst: boolean = true;
  private fen: string | null = null;
  private bestMove: string | null = null;
  private ponderMove: string | null = null;
  private engineInfo: EngineInfo = {};
  private options: EngineOptions = {
    duration: preferenceConfig.analysisDuration.defaultValue,
    multiPV: preferenceConfig.multiPV.defaultValue,
    threads: preferenceConfig.engineThreads.defaultValue
  };
  private principalMoves: string[] = [];
  private sendingEngineInfo: boolean = false;
  private processListener: (data: string) => void = this.processData.bind(this);
  private principalMovesCallback: (value: string[]) => void = () => {};
  private bestMoveCallback: (value: string) => void = () => {};
  private engineInfoCallback: (value: EngineInfo) => void = () => {};

  private async sendToProcess(data: string | string[]) {
    await this.processLock;
    this.processLock = new Promise((resolve) => {
      if (typeof data === 'string') {
        this.process?.send(data);
      } else {
        for (const line of data) {
          this.process?.send(line);
        }
      }
      resolve();
    });
    return this.processLock;
  }

  private processData(data: string) {
    if (data.startsWith('id')) {
      if (data.startsWith('id name')) {
        this.engineInfo.name = data.slice('id name'.length);
      } else if (data.startsWith('id author')) {
        this.engineInfo.author = data.slice('id author'.length);
      }
      this.sendEngineInfo();
      return;
    }
    const words = data.split(' ');
    if (words.includes('depth')) {
      const depth = getNumberValue(words, 'depth');
      if (depth === 0) {
        this.sendEngineInfo();
        return;
      }
      const pv = getNumberValue(words, 'multipv')-1;
      if (pv > this.options.multiPV-1) {
        return;
      }
      this.engineInfo.depth = depth;
      this.engineInfo.nodes = getNumberValue(words, 'nodes');
      this.engineInfo.nodesPerSecond = getNumberValue(words, 'nps');
      this.engineInfo.time = getNumberValue(words, 'time');
      const i = words.indexOf('score');
      const evaluation = this.signEvaluation(words[i+1]+' '+words[i+2]);
      if (pv === 0) {
        this.engineInfo.evaluation = evaluation;
      }
      const moves = words.slice(words.indexOf('pv')+1).join(' ');
      this.setPrincipalMove(pv, evaluation+' '+moves);
    }
    if (words.includes('bestmove')) {
      const move = words[words.indexOf('bestmove')+1].trim();
      this.bestMove = move;
      this.ponderMove = words[words.indexOf('ponder')+1];
      this.bestMoveCallback(move);
    }
  }

  private signEvaluation(evaluation: string) {
    if ((this.moves.length+Number(this.whiteFirst)) % 2 === 0) {
      const [type, n] = evaluation.split(' ');
      return type+' '+(-Number(n));
    }
    return evaluation;
  }

  private sendEngineInfo() {
    if (!this.sendingEngineInfo) {
      this.sendingEngineInfo = true;
      setTimeout(() => {
        this.engineInfoCallback(this.engineInfo);
        this.principalMovesCallback(this.principalMoves);
        this.sendingEngineInfo = false;
      }, 50);
    }
  }

  private setPrincipalMove(pv: number, move: string) {
    this.principalMoves[pv] = move;
    this.sendEngineInfo();
  }

  private resetAnalysis() {
    this.principalMoves = [];
    this.bestMove = null;
    this.ponderMove = null;
    this.engineInfo = {
      name: this.engineInfo.name,
      author: this.engineInfo.author
    };
    this.sendToProcess('stop');
  }

  private analyzePosition() {
    this.resetAnalysis();
    const pos = this.fen === null ? 'startpos' : `fen ${this.fen}`;
    this.sendToProcess([
      `position ${pos} moves ${this.moves.join(' ')}`,
      `go movetime ${this.options.duration}`
    ]);
  }

  private async sendOption(option: keyof EngineOptions) {
    if (this.optionLocks[option]) {
      await this.optionLocks[option];
      return;
    }
    this.optionLocks[option] = new Promise((resolve) => {
      setTimeout(async () => {
        const name = optionNames[option];
        const value = this.options[option];
        await this.sendToProcess([
          'stop',
          `setoption name ${name} value ${value}`
        ]);
        delete this.optionLocks[option];
        resolve();
      }, 200);
    });
    return this.optionLocks[option];
  }

  async setProcess(process: EngineProcess) {
    if (this.loadingProcess === process) {
      return;
    }
    this.loadingProcess = process;
    this.engineInfo = {};
    this.process?.removeListener('stdout', this.processListener);
    process.addListener('stdout', this.processListener);
    const uciSupported = await process.expect('uciok', 2000, 'uci');
    if (uciSupported && process === this.loadingProcess) {
      this.process = process;
      const promises = [];
      for (const option in optionNames) {
        promises.push(this.sendOption(option as keyof EngineOptions));
      }
      await Promise.all(promises);
      this.analyzePosition();
    }
    this.loadingProcess = null;
  }

  getBestMove(): string | null {
    return this.bestMove;
  }

  getPonderMove(): string | null {
    return this.ponderMove;
  }

  getMoves(): string {
    return this.moves.join(' ');
  }

  async setOption<T extends keyof EngineOptions>(
    option: T,
    value: EngineOptions[T]
  ) {
    this.options[option] = value;
    if (option in optionNames) {
      await this.sendOption(option);
    }
    if (option === 'multiPV') {
      this.analyzePosition();
    }
  }

  onPrincipalMoves(callback: (value: string[]) => void) {
    this.principalMovesCallback = callback;
  }

  onBestMove(callback: (value: string) => void) {
    this.bestMoveCallback = callback;
  }

  onEngineInfo(callback: (value: EngineInfo) => void) {
    this.engineInfoCallback = callback;
  }

  reset(fen?: string) {
    if (fen) {
      this.fen = fen;
      this.whiteFirst = fen.split(' ')[1] === 'w';
    } else {
      this.fen = null;
      this.whiteFirst = true;
    }
    this.moves = [];
    this.analyzePosition();
  }

  clear() {
    this.moves = [];
    this.resetAnalysis();
    this.sendEngineInfo();
  }

  sendMove(move: string, skipAnalysis?: boolean): string {
    this.moves.push(move);
    if (skipAnalysis) {
      this.resetAnalysis();
    } else {
      this.analyzePosition();
    }
    return this.getMoves();
  }

  undo(): string {
    this.moves.pop();
    this.analyzePosition();
    return this.getMoves();
  }
}

export default Engine;
