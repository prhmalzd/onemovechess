type StockfishEngine = { listener?: (line: string) => void; sendCommand: (command: string) => void; terminate?: () => void };
type StockfishFactory = (flavor: string) => Promise<StockfishEngine>;
export type PositionAnalysis = { evaluation: number; bestMove: string; pv: string[]; depth: number };

let enginePromise: Promise<StockfishEngine> | undefined;
let queue = Promise.resolve();

async function engine(): Promise<StockfishEngine> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const loaded = await import('stockfish') as unknown as { default?: StockfishFactory };
      const instance = await (loaded.default as StockfishFactory)('lite-single');
      await waitFor(instance, 'uci', (line) => line === 'uciok');
      await waitFor(instance, 'isready', (line) => line === 'readyok');
      return instance;
    })();
  }
  return enginePromise;
}
function waitFor(instance: StockfishEngine, command: string, done: (line: string) => boolean): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const lines: string[] = [];
    const timeout = setTimeout(() => reject(new Error('Stockfish analysis timed out.')), 30_000);
    instance.listener = (line) => { lines.push(line); if (done(line)) { clearTimeout(timeout); resolve(lines); } };
    instance.sendCommand(command);
  });
}
function parseScore(line: string, turn: 'w' | 'b'): number | null {
  const cp = line.match(/score cp (-?\d+)/); const mate = line.match(/score mate (-?\d+)/);
  const value = cp ? Number(cp[1]) / 100 : mate ? Math.sign(Number(mate[1])) * (1000 - Math.min(999, Math.abs(Number(mate[1])))) : null;
  return value === null ? null : turn === 'w' ? value : -value;
}
export const stockfishService = {
  analyzePosition(input: { fen: string; depth: number }): Promise<PositionAnalysis> {
    const task = async () => {
      const instance = await engine(); const turn = input.fen.split(' ')[1] === 'b' ? 'b' : 'w';
      instance.sendCommand(`position fen ${input.fen}`);
      const lines = await waitFor(instance, `go depth ${input.depth}`, (line) => line.startsWith('bestmove '));
      const info = [...lines].reverse().find((line) => / score (cp|mate) /.test(line));
      const best = lines.find((line) => line.startsWith('bestmove '))?.split(' ')[1] ?? '(none)';
      const pv = info?.match(/\spv\s(.+)$/)?.[1]?.split(' ') ?? [];
      return { evaluation: parseScore(info ?? '', turn) ?? 0, bestMove: best, pv, depth: input.depth };
    };
    const result = queue.then(task, task); queue = result.then(() => undefined, () => undefined); return result;
  },
  engineVersion: 'Stockfish 18 Lite WASM',
};
