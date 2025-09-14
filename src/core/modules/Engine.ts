import EngineProcess from './EngineProcess.ts';
import { defaultValues } from '../../config.ts';

class Engine {
  private process: EngineProcess;
  private searching: boolean = false;
  private needSearch: boolean = false;
  private moves: string[] = [];
  private whiteFirst: boolean = true;
  private fen: string | null = null;
  private bestMove: string | null = null;
  private ponderMove: string | null = null;
  private evaluation: string | null = null;
  private analysisDuration: number = defaultValues.analysisDuration;
  private multiPV: number = defaultValues.multiPV;
  private principalMoves: string[] = [];
  private sendingPrincipalMoves: boolean = false;
  private principalMovesCallback: (value: string[]) => void = () => {};
  private bestMoveCallback: (value: string) => void = () => {};
  private evaluationCallback: (value: string) => void = () => {};

  constructor(process: EngineProcess) {
    this.process = process;
    this.process.onMessage((data) => {
      const words: string[] = data.split(' ');
      if (words.includes('pv')) {
        const depth = words[words.indexOf('depth')+1];
        if (this.principalMoves.length === 0 && depth !== '1') {
          return;
        }
        const i = words.indexOf('score');
        const evaluation = this.signEvaluation(words[i+1]+' '+words[i+2]);
        const pv = Number(words[words.indexOf('multipv')+1])-1;
        if (pv === 0) {
          this.setEvaluation(evaluation);
        }
        const moves = words.slice(words.indexOf('pv')+1).join(' ');
        this.setPrincipalMove(pv, evaluation+' '+moves);
      }
      if (words.includes('bestmove')) {
        this.searching = false;
        if (this.needSearch) {
          this.search();
        } else {
          const move = words[words.indexOf('bestmove')+1];
          this.bestMove = move;
          this.ponderMove = words[words.indexOf('ponder')+1];
          this.bestMoveCallback(move);
        }
      }
    });
  }

  private signEvaluation(evaluation: string) {
    if ((this.moves.length+Number(this.whiteFirst)) % 2 === 0) {
      const [type, n] = evaluation.split(' ');
      return type+' '+(-Number(n));
    }
    return evaluation;
  }

  private setPrincipalMove(pv: number, move: string) {
    this.principalMoves[pv] = move;
    if (!this.sendingPrincipalMoves) {
      this.sendingPrincipalMoves = true;
      setTimeout(() => {
        this.principalMovesCallback([...this.principalMoves]);
        this.sendingPrincipalMoves = false;
      }, 50);
    }
  }

  private setEvaluation(value: string) {
    this.evaluation = value;
    this.evaluationCallback(value);
  }

  private resetAnalysis() {
    this.principalMoves = [];
    this.bestMove = null;
    this.ponderMove = null;
    this.evaluation = null;
    this.process.send('stop');
  }

  private search() {
    if (!this.searching) {
      const pos = this.fen === null ? 'startpos' : `fen ${this.fen}`;
      this.process.send(`position ${pos} moves ${this.moves.join(' ')}`);
      this.process.send(`go movetime ${this.analysisDuration}`);
      this.searching = true;
      this.needSearch = false;
    } else {
      this.needSearch = true;
    }
  }

  private analyzePosition() {
    this.resetAnalysis();
    this.search();
  }

  private sendMultiPV() {
    this.process.send(`setoption name MultiPV value ${this.multiPV}`);
  }

  getBestMove(): string | null {
    return this.bestMove;
  }

  getPonderMove(): string | null {
    return this.ponderMove;
  }

  getEvaluation(): string | null {
    return this.evaluation;
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

  onPrincipalMoves(callback: (value: string[]) => void) {
    this.principalMovesCallback = callback;
  }

  onBestMove(callback: (value: string) => void) {
    this.bestMoveCallback = callback;
  }

  onEvaluation(callback: (value: string) => void) {
    this.evaluationCallback = callback;
  }

  start() {
    this.searching = false;
    this.process.send('uci');
    this.sendMultiPV();
    this.analyzePosition();
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
