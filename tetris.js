// Canvas setup
const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
const holdCanvas = document.getElementById('hold');
const holdCtx = holdCanvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');

const COLS = 12;
const ROWS = 20;
const BLOCK_SIZE = 20;

// Tetromino shapes
const SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]]
};

const COLORS = {
    I: '#00f0f0',
    O: '#f0f000',
    T: '#a000f0',
    S: '#00f000',
    Z: '#f00000',
    J: '#0000f0',
    L: '#f0a000'
};

// Game state
let board = [];
let currentPiece = null;
let nextPiece = null;
let holdPiece = null;
let canHold = true;
let score = 0;
let gameOver = false;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let gameRunning = false;
let fastDrop = false;

// Initialize board
function createBoard() {
    board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
}

// Create a new piece
function createPiece(type) {
    const shape = SHAPES[type];
    return {
        type: type,
        shape: shape,
        x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
        y: 0,
        color: COLORS[type]
    };
}

// Get random piece type
function randomPieceType() {
    const types = Object.keys(SHAPES);
    return types[Math.floor(Math.random() * types.length)];
}

// Draw a block
function drawBlock(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = '#000';
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

// Draw the board
function drawBoard() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                drawBlock(ctx, x, y, board[y][x]);
            }
        }
    }
}

// Draw piece
function drawPiece(piece, context = ctx, offsetX = 0, offsetY = 0) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const drawX = piece.x + x + offsetX;
                const drawY = piece.y + y + offsetY;
                drawBlock(context, drawX, drawY, piece.color);
            }
        });
    });
}

// Check collision
function collide(piece, board) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const newX = piece.x + x;
                const newY = piece.y + y;
                
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                
                if (newY >= 0 && board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Merge piece with board
function merge() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const boardY = currentPiece.y + y;
                const boardX = currentPiece.x + x;
                if (boardY >= 0) {
                    board[boardY][boardX] = currentPiece.color;
                }
            }
        });
    });
}

// Rotate piece
function rotate(piece) {
    const rotated = piece.shape[0].map((_, i) =>
        piece.shape.map(row => row[i]).reverse()
    );
    
    const originalShape = piece.shape;
    piece.shape = rotated;
    
    // Wall kick
    let offset = 0;
    while (collide(piece, board)) {
        piece.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > piece.shape[0].length) {
            piece.shape = originalShape;
            return;
        }
    }
}

// Move piece
function move(dir) {
    currentPiece.x += dir;
    if (collide(currentPiece, board)) {
        currentPiece.x -= dir;
    }
}

// Drop piece
function drop() {
    currentPiece.y++;
    if (collide(currentPiece, board)) {
        currentPiece.y--;
        merge();
        clearLines();
        currentPiece = nextPiece;
        nextPiece = createPiece(randomPieceType());
        canHold = true;
        
        if (collide(currentPiece, board)) {
            gameOver = true;
            gameRunning = false;
            alert('Game Over! Score: ' + score);
            return;
        }
    }
    dropCounter = 0;
}

// Hard drop (instant drop)
function hardDrop() {
    while (!collide(currentPiece, board)) {
        currentPiece.y++;
        score += 2;
    }
    currentPiece.y--;
    drop();
}

// Clear completed lines
function clearLines() {
    let linesCleared = 0;
    
    outer: for (let y = ROWS - 1; y >= 0; y--) {
        for (let x = 0; x < COLS; x++) {
            if (!board[y][x]) {
                continue outer;
            }
        }
        
        // Remove the line
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        y++;
        linesCleared++;
    }
    
    // Update score
    if (linesCleared > 0) {
        score += [0, 100, 300, 500, 800][linesCleared];
        updateScore();
    }
}

// Hold piece
function holdCurrentPiece() {
    if (!canHold) return;
    
    if (holdPiece === null) {
        holdPiece = createPiece(currentPiece.type);
        currentPiece = nextPiece;
        nextPiece = createPiece(randomPieceType());
    } else {
        const temp = createPiece(holdPiece.type);
        holdPiece = createPiece(currentPiece.type);
        currentPiece = temp;
    }
    
    canHold = false;
    drawHoldPiece();
}

// Draw hold piece
function drawHoldPiece() {
    holdCtx.fillStyle = '#000';
    holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
    
    if (holdPiece) {
        const tempPiece = {
            ...holdPiece,
            x: 1,
            y: 1
        };
        drawPiece(tempPiece, holdCtx);
    }
}

// Draw next piece
function drawNextPiece() {
    nextCtx.fillStyle = '#000';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (nextPiece) {
        const tempPiece = {
            ...nextPiece,
            x: 1,
            y: 1
        };
        drawPiece(tempPiece, nextCtx);
    }
}

// Update score display
function updateScore() {
    document.getElementById('score').textContent = score;
}

// Game loop
function update(time = 0) {
    if (!gameRunning) return;
    
    const deltaTime = time - lastTime;
    lastTime = time;
    
    dropCounter += deltaTime;
    const currentDropInterval = fastDrop ? 50 : dropInterval;
    
    if (dropCounter > currentDropInterval) {
        drop();
    }
    
    drawBoard();
    drawPiece(currentPiece);
    drawNextPiece();
    
    requestAnimationFrame(update);
}

// Keyboard controls
document.addEventListener('keydown', event => {
    if (!gameRunning || gameOver) return;
    
    switch(event.key) {
        case 'ArrowLeft':
            move(-1);
            break;
        case 'ArrowRight':
            move(1);
            break;
        case 'ArrowDown':
            fastDrop = true;
            break;
        case 'ArrowUp':
            hardDrop();
            break;
        case ' ':
            rotate(currentPiece);
            break;
        case 'c':
        case 'C':
            holdCurrentPiece();
            break;
    }
});

document.addEventListener('keyup', event => {
    if (event.key === 'ArrowDown') {
        fastDrop = false;
    }
});

// Start game
function startGame() {
    createBoard();
    score = 0;
    gameOver = false;
    dropCounter = 0;
    lastTime = 0;
    fastDrop = false;
    canHold = true;
    holdPiece = null;
    
    currentPiece = createPiece(randomPieceType());
    nextPiece = createPiece(randomPieceType());
    
    updateScore();
    drawHoldPiece();
    drawNextPiece();
    
    gameRunning = true;
    requestAnimationFrame(update);
}

// Start button
document.getElementById('start-btn').addEventListener('click', () => {
    if (!gameRunning) {
        startGame();
    }
});

// Initialize
createBoard();
drawBoard();
