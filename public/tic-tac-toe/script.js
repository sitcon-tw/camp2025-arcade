class TicTacToeClient {
    constructor() {
        this.socket = null;
        this.currentRoomId = null;
        this.playerSymbol = null;
        this.gameState = null;
        this.isGameReady = false;
        this.authToken = localStorage.getItem('userToken');
        this.currentUser = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeAuth();
    }

    initializeElements() {
        this.authSection = document.getElementById('auth-section');
        this.roomSection = document.getElementById('room-section');
        this.gameSection = document.getElementById('game-section');
        this.roomInput = document.getElementById('room-input');
        this.joinBtn = document.getElementById('join-btn');
        this.createBtn = document.getElementById('create-btn');
        this.logoutBtn = document.getElementById('logout-btn');
        this.playerSymbolDisplay = document.getElementById('player-symbol');
        this.roomIdDisplay = document.getElementById('room-id-display');
        this.statusText = document.getElementById('status-text');
        this.gameBoard = document.getElementById('game-board');
        this.restartBtn = document.getElementById('restart-btn');
        this.leaveBtn = document.getElementById('leave-btn');
        this.messagesDiv = document.getElementById('messages');
        this.cells = document.querySelectorAll('.cell');
        this.userPhoto = document.getElementById('user-photo');
        this.userName = document.getElementById('user-name');
        this.userUsername = document.getElementById('user-username');
        this.playerXCard = document.getElementById('player-x');
        this.playerOCard = document.getElementById('player-o');
        this.authLoading = document.getElementById('auth-loading');
        this.authError = document.getElementById('auth-error');
    }

    setupEventListeners() {
        this.joinBtn.addEventListener('click', () => this.joinRoom());
        this.createBtn.addEventListener('click', () => this.createRoom());
        this.restartBtn.addEventListener('click', () => this.restartGame());
        this.leaveBtn.addEventListener('click', () => this.leaveRoom());
        this.logoutBtn.addEventListener('click', () => this.logout());
        
        this.roomInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.joinRoom();
            }
        });

        this.cells.forEach(cell => {
            cell.addEventListener('click', (e) => this.makeMove(e));
        });
    }

    initializeAuth() {
        // Check if user is already logged in
        const isUser = localStorage.getItem('isUser');
        const userData = localStorage.getItem('userData');
        
        if (this.authToken && isUser === 'true' && userData) {
            this.currentUser = JSON.parse(userData);
            this.connectSocket();
            this.showRoomSection();
        } else {
            this.showAuthSection();
            this.checkUrlParams();
            this.setupTelegramLogin();
        }
    }

    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const hash = urlParams.get('hash');
        
        if (hash) {
            // Parse Telegram OAuth data from URL parameters
            const authData = {
                id: parseInt(urlParams.get('id')),
                first_name: urlParams.get('first_name'),
                last_name: urlParams.get('last_name'),
                username: urlParams.get('username'),
                photo_url: urlParams.get('photo_url'),
                auth_date: parseInt(urlParams.get('auth_date')),
                hash: hash
            };
            
            // Remove null values
            Object.keys(authData).forEach(key => {
                if (authData[key] === null || authData[key] === 'null') {
                    delete authData[key];
                }
            });
            
            this.handleTelegramAuth(authData);
        }
    }
    
    setupTelegramLogin() {
        const widgetContainer = document.getElementById('telegram-widget-container');
        if (!widgetContainer) return;
        
        // Remove existing widget if any
        const existingWidget = document.getElementById('telegram-login-widget');
        if (existingWidget) {
            existingWidget.remove();
        }
        
        // Create Telegram login widget
        const telegramLoginWidget = document.createElement('script');
        telegramLoginWidget.id = 'telegram-login-widget';
        telegramLoginWidget.src = 'https://telegram.org/js/telegram-widget.js?22';
        telegramLoginWidget.setAttribute('data-telegram-login', 'sitconcamp2025bot');
        telegramLoginWidget.setAttribute('data-size', 'large');
        telegramLoginWidget.setAttribute('data-auth-url', window.location.origin + window.location.pathname);
        telegramLoginWidget.setAttribute('data-request-access', 'write');
        
        widgetContainer.appendChild(telegramLoginWidget);
    }

    async handleTelegramAuth(authData) {
        this.showAuthLoading();
        
        try {
            const response = await fetch('/api/auth/telegram', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(authData)
            });

            const data = await response.json();
            
            if (data.success) {
                this.authToken = data.token;
                this.currentUser = data.user;
                
                // Store auth data (same format as camp2025-stock)
                localStorage.setItem('isUser', 'true');
                localStorage.setItem('userToken', this.authToken);
                localStorage.setItem('userData', JSON.stringify(this.currentUser));
                localStorage.setItem('telegramData', JSON.stringify(authData));
                
                // Trigger auth state change event
                window.dispatchEvent(new Event('authStateChanged'));
                
                this.connectSocket();
                this.showRoomSection();
                this.addMessage('Successfully logged in!', 'success');
            } else {
                this.showAuthError(data.message || 'Authentication failed');
            }
        } catch (error) {
            console.error('Auth error:', error);
            this.showAuthError('Authentication failed. Please try again.');
        }
    }

    connectSocket() {
        this.socket = io({
            auth: {
                token: this.authToken
            }
        });
        
        this.setupSocketListeners();
    }

    setupSocketListeners() {
        this.socket.on('auth-required', () => {
            this.logout();
        });

        this.socket.on('joined-room', (data) => {
            this.currentRoomId = data.roomId;
            this.playerSymbol = data.playerSymbol;
            this.gameState = data.gameState;
            this.showGameSection();
            this.updatePlayersDisplay();
            this.addMessage(`Joined room: ${data.roomId}`, 'success');
            this.addMessage(`You are player ${data.playerSymbol}`, 'info');
        });

        this.socket.on('room-full', () => {
            this.addMessage('Room is full. Please try another room.', 'error');
        });

        this.socket.on('player-joined', (data) => {
            this.gameState = data.gameState;
            this.updatePlayersDisplay();
            this.addMessage(`Player ${data.playerSymbol} joined the game`, 'success');
        });

        this.socket.on('game-ready', (gameState) => {
            this.gameState = gameState;
            this.isGameReady = true;
            this.updateGameDisplay();
            this.updatePlayersDisplay();
            this.addMessage('Game is ready! Start playing!', 'success');
        });

        this.socket.on('game-update', (gameState) => {
            this.gameState = gameState;
            this.updateGameDisplay();
            this.updatePlayersDisplay();
        });

        this.socket.on('invalid-move', () => {
            this.addMessage('Invalid move. Try again.', 'error');
        });

        this.socket.on('player-left', (gameState) => {
            this.gameState = gameState;
            this.isGameReady = false;
            this.updateGameDisplay();
            this.updatePlayersDisplay();
            this.addMessage('Your opponent left the game', 'error');
        });
    }

    generateRoomId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    joinRoom() {
        const roomId = this.roomInput.value.trim() || this.generateRoomId();
        this.socket.emit('join-room', roomId);
    }

    createRoom() {
        const roomId = this.generateRoomId();
        this.roomInput.value = roomId;
        this.socket.emit('join-room', roomId);
    }

    makeMove(event) {
        const cell = event.target;
        const position = parseInt(cell.dataset.index);
        
        if (!this.isGameReady || this.gameState.gameOver || 
            this.gameState.currentPlayer !== this.playerSymbol ||
            this.gameState.board[position] !== null) {
            return;
        }

        this.socket.emit('make-move', {
            roomId: this.currentRoomId,
            position: position
        });
    }

    restartGame() {
        this.socket.emit('restart-game');
    }

    leaveRoom() {
        if (this.socket) {
            this.socket.disconnect();
            this.connectSocket();
        }
        this.showRoomSection();
        this.currentRoomId = null;
        this.playerSymbol = null;
        this.gameState = null;
        this.isGameReady = false;
        this.addMessage('Left the room', 'info');
    }

    showAuthSection() {
        this.authSection.classList.remove('hidden');
        this.roomSection.classList.add('hidden');
        this.gameSection.classList.add('hidden');
    }

    showRoomSection() {
        this.authSection.classList.add('hidden');
        this.roomSection.classList.remove('hidden');
        this.gameSection.classList.add('hidden');
        
        if (this.currentUser) {
            this.userPhoto.src = this.currentUser.photo_url || '/default-avatar.png';
            this.userName.textContent = this.currentUser.first_name + (this.currentUser.last_name ? ' ' + this.currentUser.last_name : '');
            this.userUsername.textContent = '@' + (this.currentUser.username || 'unknown');
        }
    }

    showGameSection() {
        this.authSection.classList.add('hidden');
        this.roomSection.classList.add('hidden');
        this.gameSection.classList.remove('hidden');
        this.playerSymbolDisplay.textContent = this.playerSymbol;
        this.roomIdDisplay.textContent = `Room: ${this.currentRoomId}`;
        this.updateGameDisplay();
    }

    updatePlayersDisplay() {
        if (!this.gameState || !this.gameState.playerInfo) return;
        
        const playerXInfo = Object.values(this.gameState.playerInfo).find(p => p.symbol === 'X');
        const playerOInfo = Object.values(this.gameState.playerInfo).find(p => p.symbol === 'O');
        
        this.updatePlayerCard(this.playerXCard, playerXInfo);
        this.updatePlayerCard(this.playerOCard, playerOInfo);
    }

    updatePlayerCard(card, playerInfo) {
        const avatar = card.querySelector('.player-avatar');
        const name = card.querySelector('.player-name');
        
        if (playerInfo) {
            card.classList.remove('empty');
            avatar.src = playerInfo.photo_url || '/default-avatar.png';
            name.textContent = playerInfo.first_name || playerInfo.username || 'Player';
        } else {
            card.classList.add('empty');
            avatar.src = '/default-avatar.png';
            name.textContent = 'Waiting...';
        }
    }

    showAuthLoading() {
        this.authLoading.classList.remove('hidden');
        this.authError.classList.add('hidden');
    }
    
    showAuthError(message) {
        this.authLoading.classList.add('hidden');
        this.authError.classList.remove('hidden');
        this.authError.querySelector('p').textContent = message;
    }
    
    logout() {
        // Clear auth data (same format as camp2025-stock)
        localStorage.removeItem('isUser');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('telegramData');
        
        this.authToken = null;
        this.currentUser = null;
        
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        // Trigger auth state change event
        window.dispatchEvent(new Event('authStateChanged'));
        
        this.showAuthSection();
        this.roomInput.value = '';
        this.clearBoard();
        this.addMessage('Logged out successfully', 'info');
    }

    updateGameDisplay() {
        if (!this.gameState) return;

        this.updateBoard();
        this.updateStatus();
        this.updateRestartButton();
    }

    updateBoard() {
        this.cells.forEach((cell, index) => {
            const cellValue = this.gameState.board[index];
            cell.textContent = cellValue || '';
            cell.className = 'cell';
            
            if (cellValue) {
                cell.classList.add(cellValue.toLowerCase());
            }
            
            if (this.gameState.gameOver || !this.isGameReady ||
                this.gameState.currentPlayer !== this.playerSymbol ||
                cellValue !== null) {
                cell.classList.add('disabled');
            }
        });
    }

    updateStatus() {
        if (!this.isGameReady) {
            this.statusText.textContent = 'Waiting for opponent...';
            return;
        }

        if (this.gameState.gameOver) {
            if (this.gameState.winner === 'draw') {
                this.statusText.textContent = "It's a draw!";
            } else if (this.gameState.winner === this.playerSymbol) {
                this.statusText.textContent = 'You won!';
            } else {
                this.statusText.textContent = 'You lost!';
            }
        } else {
            if (this.gameState.currentPlayer === this.playerSymbol) {
                this.statusText.textContent = 'Your turn';
            } else {
                this.statusText.textContent = "Opponent's turn";
            }
        }
    }

    updateRestartButton() {
        if (this.gameState && this.gameState.gameOver) {
            this.restartBtn.classList.remove('hidden');
        } else {
            this.restartBtn.classList.add('hidden');
        }
    }

    clearBoard() {
        this.cells.forEach(cell => {
            cell.textContent = '';
            cell.className = 'cell';
        });
    }

    addMessage(message, type = 'info') {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
        
        this.messagesDiv.appendChild(messageElement);
        this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;
        
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 10000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TicTacToeClient();
});