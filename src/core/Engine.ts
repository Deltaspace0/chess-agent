import Worker from 'web-worker';
import { analysisDurations, defaultValues } from '../config.ts';

class Engine {
  private engine: Worker;
  private searching: boolean = false;
  private needSearch: boolean = false;
  private moves: string[] = [];
  private whiteFirst: boolean = true;
  private fen: string | null = null;
  private bestMove: string | null = null;
  private ponderMove: string | null = null;
  private evaluation: string | null = null;
  private analysisDuration: number = defaultValues.analysisDuration;
  private principalMoves: string[] = [];
  private principalMovesCallback: (value: string[]) => void = () => {};
  private bestMoveCallback: (value: string) => void = () => {};
  private ponderMoveCallback: (value: string) => void = () => {};
  private evaluationCallback: (value: string) => void = () => {};
  private durationCallback: (value: number) => void = () => {};

  constructor() {
    this.engine = new Worker(new URL('stockfish.js', import.meta.url), { type: 'module' });
    this.engine.addEventListener('message', (e) => {
      const words: string[] = e.data.split(' ');
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
          this.setBestMove(words[words.indexOf('bestmove')+1]);
          this.setPonderMove(words[words.indexOf('ponder')+1]);
        }
      }
    });
    this.engine.postMessage('uci');
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
    this.principalMovesCallback([...this.principalMoves]);
  }

  private setBestMove(value: string) {
    this.bestMove = value;
    this.bestMoveCallback(value);
  }

  private setPonderMove(value: string) {
    this.ponderMove = value;
    this.ponderMoveCallback(value);
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
    this.engine.postMessage('stop');
  }

  private search() {
    if (!this.searching) {
      const pos = this.fen === null ? 'startpos' : `fen ${this.fen}`;
      this.engine.postMessage(`position ${pos} moves ${this.moves.join(' ')}`);
      this.engine.postMessage(`go movetime ${this.analysisDuration}`);
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

  getAnalysisDuration(): number {
    return this.analysisDuration;
  }

  setAnalysisDuration(value: number) {
    this.analysisDuration = value;
    this.durationCallback(value);
  }

  switchAnalysisDuration(): number {
    const i = analysisDurations.indexOf(this.analysisDuration);
    const duration = analysisDurations[(i+1)%analysisDurations.length];
    this.setAnalysisDuration(duration);
    return this.analysisDuration;
  }

  setMultiPV(value: number) {
    this.engine.postMessage(`setoption name MultiPV value ${value}`);
    this.analyzePosition();
  }

  onPrincipalMoves(callback: (value: string[]) => void) {
    this.principalMovesCallback = callback;
  }

  onBestMove(callback: (value: string) => void) {
    this.bestMoveCallback = callback;
  }

  onPonderMove(callback: (value: string) => void) {
    this.ponderMoveCallback = callback;
  }

  onEvaluation(callback: (value: string) => void) {
    this.evaluationCallback = callback;
  }

  onUpdateDuration(callback: (value: number) => void) {
    this.durationCallback = callback;
  }

  reset(fen?: string) {
    if (fen) {
      this.fen = fen;
      this.whiteFirst = fen.split(' ')[1] === 'w';
    } else {
      this.fen = null;
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
