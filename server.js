const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const TelegramAuthService = require('./auth');

const authService = new TelegramAuthService(
  process.env.TELEGRAM_BOT_TOKEN,
  process.env.JWT_SECRET || 'your-jwt-secret'
);

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));
app.use(express.json());

app.post('/api/auth/telegram', async (req, res) => {
  try {
    const authData = req.body;
    
    if (!authService.verifyTelegramAuth(authData)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid authentication data' 
      });
    }

    const user = {
      telegram_id: authData.id,
      username: authData.username,
      first_name: authData.first_name,
      last_name: authData.last_name,
      photo_url: authData.photo_url
    };

    const token = authService.createUserToken(user);
    
    res.json({
      success: true,
      token,
      user
    });
  } catch (error) {
    console.error('Telegram auth error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

class TicTacToeGame {
  constructor() {
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.players = {};
    this.playerInfo = {};
    this.gameOver = false;
    this.winner = null;
  }

  makeMove(position, playerId) {
    if (this.gameOver || this.board[position] !== null) {
      return false;
    }

    const playerSymbol = this.players[playerId];
    if (playerSymbol !== this.currentPlayer) {
      return false;
    }

    this.board[position] = this.currentPlayer;
    
    if (this.checkWinner()) {
      this.gameOver = true;
      this.winner = this.currentPlayer;
    } else if (this.board.every(cell => cell !== null)) {
      this.gameOver = true;
      this.winner = 'draw';
    } else {
      this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }

    return true;
  }

  checkWinner() {
    const winningCombinations = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    return winningCombinations.some(combo => {
      const [a, b, c] = combo;
      return this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c];
    });
  }

  reset() {
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.gameOver = false;
    this.winner = null;
  }

  getGameState() {
    return {
      board: this.board,
      currentPlayer: this.currentPlayer,
      gameOver: this.gameOver,
      winner: this.winner,
      players: this.players,
      playerInfo: this.playerInfo
    };
  }
}

const rooms = new Map();

io.on('connection', (socket) => {
  const userData = authService.extractTokenFromSocket(socket);
  
  if (!userData) {
    console.log('Unauthenticated user connected:', socket.id);
    socket.emit('auth-required');
    return;
  }
  
  socket.userData = userData;
  console.log('Authenticated user connected:', socket.id, userData.username);

  socket.on('join-room', (roomId) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new TicTacToeGame());
    }

    const game = rooms.get(roomId);
    const playerCount = Object.keys(game.players).length;

    if (playerCount >= 2) {
      socket.emit('room-full');
      return;
    }

    socket.join(roomId);
    socket.roomId = roomId;
    
    const playerSymbol = playerCount === 0 ? 'X' : 'O';
    game.players[socket.id] = playerSymbol;
    game.playerInfo[socket.id] = {
      username: socket.userData.username,
      first_name: socket.userData.first_name,
      photo_url: socket.userData.photo_url,
      symbol: playerSymbol
    };
    socket.playerSymbol = playerSymbol;

    socket.emit('joined-room', {
      roomId,
      playerSymbol,
      gameState: game.getGameState()
    });

    socket.to(roomId).emit('player-joined', {
      playerSymbol,
      gameState: game.getGameState()
    });

    if (Object.keys(game.players).length === 2) {
      io.to(roomId).emit('game-ready', game.getGameState());
    }
  });

  socket.on('make-move', (data) => {
    const { roomId, position } = data;
    const game = rooms.get(roomId);

    if (!game || !game.makeMove(position, socket.id)) {
      socket.emit('invalid-move');
      return;
    }

    io.to(roomId).emit('game-update', game.getGameState());
  });

  socket.on('restart-game', () => {
    if (socket.roomId) {
      const game = rooms.get(socket.roomId);
      if (game) {
        game.reset();
        io.to(socket.roomId).emit('game-update', game.getGameState());
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.roomId) {
      const game = rooms.get(socket.roomId);
      if (game) {
        delete game.players[socket.id];
        delete game.playerInfo[socket.id];
        
        if (Object.keys(game.players).length === 0) {
          rooms.delete(socket.roomId);
        } else {
          socket.to(socket.roomId).emit('player-left', game.getGameState());
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});