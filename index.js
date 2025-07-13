const express = require('express');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const fenValidator = require('fen-validator');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

function runStockfish(fen, depth) {
  return new Promise((resolve, reject) => {
    const stockfish = spawn('./stockfish');

    let bestMove = null;

    stockfish.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('bestmove')) {
        const match = output.match(/bestmove\s(\S+)/);
        if (match) bestMove = match[1];
        stockfish.kill();
      }
    });

    stockfish.stdin.write(`position fen ${fen}\n`);
    stockfish.stdin.write(`go depth ${depth}\n`);

    stockfish.on('close', () => {
      if (bestMove) resolve(bestMove);
      else reject('No best move found');
    });

    stockfish.on('error', (err) => {
      reject(err);
    });
  });
}

app.post('/evaluate', async (req, res) => {
  const { fen, depth } = req.body;

  if (!fen) {
    return res.status(400).json({ error: 'FEN required' });
  }

  // Validate FEN here
  if (!fenValidator.validate(fen)) {
    return res.status(400).json({ error: 'Invalid FEN string' });
  }

  const searchDepth = depth || 10;

  try {
    const bestmove = await runStockfish(fen, searchDepth);
    res.json({ bestmove });
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

app.get('/', (req, res) => {
  res.send('Stockfish API is running.');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
