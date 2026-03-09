import EventEmitter from 'events';
import type { AgentEngine } from '../Agent.ts';
import EngineProcess from './EngineProcess.ts';
import { preferenceConfig } from '../../../config.ts';

interface EngineUCIEventMap {
  info: [value: EngineInfo];
}

interface EngineOptions {
  duration: number;
  multiPV: number;
  threads: number;
  skillLevel: number;
}

const optionNames: Partial<Record<keyof EngineOptions, string>> = {
  multiPV: 'MultiPV',
  threads: 'Threads',
  skillLevel: 'Skill Level'
};

function getNumberValue(words: string[], name: string): number {
  return Number(words[words.indexOf(name)+1]);
}

class EngineUCI extends EventEmitter<EngineUCIEventMap> implements AgentEngine {
  private process: EngineProcess | null = null;
  private loadingProcess: EngineProcess | null = null;
  private moves: string[] = [];
  private analyzedMoves: string[] = [];
  private whiteFirst = true;
  private waitingReady = false;
  private fen: string | null = null;
  private engineInfo: EngineInfo = { principalVariations: [] };
  private options: EngineOptions = {
    duration: preferenceConfig.analysisDuration.defaultValue,
    multiPV: preferenceConfig.multiPV.defaultValue,
    threads: preferenceConfig.engineThreads.defaultValue,
    skillLevel: preferenceConfig.engineLevel.defaultValue
  };
  private processListener = this.processData.bind(this);

  private sendToProcess(data: string | string[]) {
    if (typeof data === 'string') {
      this.process?.send(data);
    } else {
      data.forEach((line) => this.process?.send(line));
    }
  }

  private processData(data: string) {
    if (data.includes('readyok')) {
      this.waitingReady = false;
      return;
    }
    if (this.waitingReady) {
      return;
    }
    if (data.startsWith('id')) {
      if (data.startsWith('id name')) {
        this.engineInfo.name = data.slice('id name '.length);
      } else if (data.startsWith('id author')) {
        this.engineInfo.author = data.slice('id author '.length);
      }
      this.emitInfo();
      return;
    }
    const words = data.split(' ');
    if (words.includes('depth')) {
      const depth = getNumberValue(words, 'depth');
      if (depth === 0) {
        this.emitInfo();
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
      const variation = words.slice(words.indexOf('pv')+1).join(' ');
      this.setPrincipalVariation(pv, { evaluation, variation });
    }
    if (words.includes('bestmove')) {
      const move = words[words.indexOf('bestmove')+1].trim();
      this.engineInfo.bestMove = move;
      this.engineInfo.ponderMove = words.includes('ponder')
        ? words[words.indexOf('ponder')+1]
        : undefined;
      this.emitInfo();
    }
  }

  private signEvaluation(evaluation: string) {
    if ((this.analyzedMoves.length+Number(this.whiteFirst)) % 2 === 0) {
      const [type, n] = evaluation.split(' ');
      return type+' '+(-Number(n));
    }
    return evaluation;
  }

  private emitInfo() {
    this.emit('info', this.engineInfo);
  }

  private setPrincipalVariation(pv: number, move: PrincipalVariation) {
    this.engineInfo.principalVariations[pv] = move;
    this.emitInfo();
  }

  private resetAnalysis() {
    this.engineInfo = {
      principalVariations: [],
      name: this.engineInfo.name,
      author: this.engineInfo.author
    };
    this.sendStop();
    this.emitInfo();
  }

  private sendStop() {
    this.waitingReady = true;
    this.sendToProcess('stop');
    this.sendToProcess('isready');
  }

  private sendOption(option: keyof EngineOptions) {
    const name = optionNames[option];
    const value = this.options[option];
    this.sendToProcess(`setoption name ${name} value ${value}`);
  }

  analyzePosition(moves?: string[], duration?: number) {
    this.resetAnalysis();
    const pos = this.fen === null ? 'startpos' : `fen ${this.fen}`;
    this.analyzedMoves = moves ? [...this.moves, ...moves] : this.moves;
    this.sendToProcess([
      `position ${pos} moves ${this.analyzedMoves.join(' ')}`,
      `go movetime ${duration ?? this.options.duration}`
    ]);
  }

  async setProcess(process: EngineProcess) {
    if (this.loadingProcess === process) {
      return;
    }
    this.loadingProcess = process;
    this.engineInfo = { principalVariations: [] };
    this.process?.removeListener('stdout', this.processListener);
    process.addListener('stdout', this.processListener);
    const uciSupported = await process.expect('uciok', 2000, 'uci');
    if (uciSupported && process === this.loadingProcess) {
      this.process = process;
      for (const option in optionNames) {
        this.sendOption(option as keyof EngineOptions);
      }
      this.analyzePosition();
    }
    this.loadingProcess = null;
  }

  getEngineInfo(): EngineInfo {
    return this.engineInfo;
  }

  getMoves(): string {
    return this.moves.join(' ');
  }

  setOption<T extends keyof EngineOptions>(
    option: T,
    value: EngineOptions[T]
  ) {
    this.options[option] = value;
    if (option in optionNames) {
      this.sendStop();
      this.sendOption(option);
    }
    if (option !== 'threads') {
      this.analyzePosition();
    }
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

export default EngineUCI;
