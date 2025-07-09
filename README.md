# Multiplayer Tic-Tac-Toe with Telegram Auth

A real-time multiplayer Tic-Tac-Toe game built with Node.js, Express, Socket.IO, and Telegram authentication.

## Features

- **Telegram Authentication** - secure login using Telegram OAuth
- **Real-time multiplayer gameplay** using WebSocket connections
- **Room-based system** - players can join specific rooms or create new ones
- **Player profiles** - display Telegram user information and avatars
- **Responsive design** that works on desktop and mobile
- **Game state management** with turn-based gameplay
- **Automatic win detection** and draw handling
- **Authenticated user tracking** - only logged-in users can play

## How to Play

1. **Setup environment variables**:
   - Copy `.env.example` to `.env`
   - Set your `TELEGRAM_BOT_TOKEN` and `JWT_SECRET`
2. **Start the server**: `npm start`
3. **Open your browser** and go to `http://localhost:3000`
4. **Login with Telegram** - click the Telegram login button
5. **Create or join a room**:
   - Enter a room ID and click "Join Room"
   - Or click "Create Room" to generate a random room ID
6. **Share the room ID** with another player
7. **Play the game** - players take turns clicking on the board
8. **Restart** the game when finished

## Setup Requirements

### Telegram Bot Setup
1. Create a bot using [@BotFather](https://t.me/BotFather)
2. Get your bot token
3. Set the domain for your bot using `/setdomain` command
4. Update the bot name in `public/script.js` (line with `data-telegram-login`)

**Note**: This uses the same authentication system as camp2025-stock, with Telegram Web Login widget instead of Telegram Bot API.

## Technical Implementation

### Backend (server.js)
- **Express server** serves static files and handles HTTP requests
- **Socket.IO** manages real-time WebSocket connections
- **Telegram Web Authentication** using the same system as camp2025-stock
- **JWT token management** for secure user sessions
- **Game logic** including move validation, win detection, and state management
- **Room management** allows multiple game sessions simultaneously

### Frontend (public/)
- **HTML/CSS/JavaScript** for the user interface
- **Socket.IO client** for real-time communication
- **Responsive design** with mobile-friendly layout
- **Game state synchronization** between players

## Game Rules

- Players alternate turns (X goes first)
- Click on empty cells to make a move
- Win by getting 3 in a row (horizontal, vertical, or diagonal)
- Game ends in a draw if all cells are filled without a winner
- Only the current player can make moves

## Installation

```bash
npm install
npm start
```

The server will start on port 3000. Open multiple browser windows to test multiplayer functionality.

## Room System

- Each room supports exactly 2 players
- Room IDs are case-insensitive and 6 characters long
- Players are automatically assigned X or O symbols
- Games are isolated per room - multiple games can run simultaneously