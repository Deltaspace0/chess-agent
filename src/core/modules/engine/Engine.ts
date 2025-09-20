import EngineProcess from './EngineProcess.ts';
import { preferenceConfig } from '../../../config.ts';

function getNumberValue(words: string[], name: string): number {
  return Number(words[words.indexOf(name)+1]);
}

class Engine {
  private process: EngineProcess | null = null;
  private moves: string[] = [];
  private whiteFirst: boolean = true;
  private fen: string | null = null;
  private bestMove: string | null = null;
  private ponderMove: string | null = null;
  private engineInfo: EngineInfo = {};
  private analysisDuration: number = preferenceConfig.analysisDuration.defaultValue;
  private multiPV: number = preferenceConfig.multiPV.defaultValue;
  private threads: number = preferenceConfig.engineThreads.defaultValue;
  private principalMoves: string[] = [];
  private sendingEngineInfo: boolean = false;
  private processListener: (data: string) => void = this.processData.bind(this);
  private principalMovesCallback: (value: string[]) => void = () => {};
  private bestMoveCallback: (value: string) => void = () => {};
  private engineInfoCallback: (value: EngineInfo) => void = () => {};

  private sendToProcess(data: string) {
    if (this.process) {
      this.process.send(data);
    }
  }

  private processData(data: string) {
    const words = data.split(' ');
    if (words.includes('depth')) {
      const depth = getNumberValue(words, 'depth');
      if (depth === 0) {
        this.sendEngineInfo();
        return;
      }
      const pv = getNumberValue(words, 'multipv')-1;
      if (pv > this.multiPV-1) {
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
      const move = words[words.indexOf('bestmove')+1];
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
    this.engineInfo = {};
    this.sendToProcess('stop');
  }

  private analyzePosition() {
    this.resetAnalysis();
    const pos = this.fen === null ? 'startpos' : `fen ${this.fen}`;
    this.sendToProcess(`position ${pos} moves ${this.moves.join(' ')}`);
    this.sendToProcess(`go movetime ${this.analysisDuration}`);
  }

  private sendMultiPV() {
    this.sendToProcess(`stop`);
    this.sendToProcess(`setoption name MultiPV value ${this.multiPV}`);
  }

  private sendThreads() {
    this.sendToProcess(`stop`);
    this.sendToProcess(`setoption name Threads value ${this.threads}`);
  }

  setProcess(process: EngineProcess) {
    this.process?.removeListener('stdout', this.processListener);
    this.process = process;
    this.process.addListener('stdout', this.processListener);
    this.sendToProcess('uci');
    this.sendMultiPV();
    this.sendThreads();
    this.analyzePosition();
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

  setAnalysisDuration(value: number) {
    this.analysisDuration = value;
  }

  setMultiPV(value: number) {
    this.multiPV = value;
    this.sendMultiPV();
    this.analyzePosition();
  }

  setThreads(value: number) {
    this.threads = value;
    this.sendThreads();
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
