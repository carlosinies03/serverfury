// =============================================
//         CÓDIGO PARA CAMBIAR VISTAS
// =============================================
const lobbyView = document.getElementById('lobby-view');
const gameView = document.getElementById('game-view');
const playButton = document.getElementById('play-button');

const debugToggle = document.getElementById('debug-mode-toggle');
const debugOptionsContainer = document.getElementById('debug-options');
const startScoreInput = document.getElementById('start-score-input');
const startEventSelect = document.getElementById('start-event-select');

let phaserGame;

debugToggle.addEventListener('change', () => {
    debugOptionsContainer.classList.toggle('hidden', !debugToggle.checked);
});

playButton.addEventListener('click', () => {
    document.body.classList.add('game-active');
    lobbyView.style.display = 'none';
    gameView.style.display = 'flex';

    const debugOptions = { startScore: 0, startEvent: 'none' };

    if (debugToggle.checked) {
        debugOptions.startScore = parseInt(startScoreInput.value, 10) || 0;
        debugOptions.startEvent = startEventSelect.value;
    }

    if (!phaserGame) {
        phaserGame = new Phaser.Game(config);
        phaserGame.events.on('ready', () => {
            phaserGame.scene.add('mainScene', MainScene, true, debugOptions);
        });
    } else {
        phaserGame.scene.start('mainScene', debugOptions);
    }
});


// ==============================================================================
// >>>>>>>>>> LÓGICA DE AUTENTICACIÓN Y PUNTUACIONES CONECTADA AL BACKEND <<<<<<<<<<
// ==============================================================================
const welcomeMsg = document.querySelector('.welcome-msg');
const usernameText = document.getElementById('username-text');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');

const loginModal = document.getElementById('modal-login');
const registerModal = document.getElementById('modal-register');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

const leaderboardList = document.getElementById('leaderboard-list');
const API_URL = 'http://localhost:3000'; // URL base de tu backend

// Función para actualizar la interfaz de usuario según el estado de la sesión
function updateUIForAuthState() {
    const token = sessionStorage.getItem('authToken');
    const currentUser = sessionStorage.getItem('currentUser');

    if (token && currentUser) {
        // Usuario ha iniciado sesión
        welcomeMsg.textContent = `¡Bienvenido, ${currentUser}!`;
        usernameText.textContent = currentUser;
        loginBtn.classList.add('hidden');
        registerBtn.classList.add('hidden');
        logoutBtn.classList.remove('hidden');
    } else {
        // Usuario no ha iniciado sesión
        welcomeMsg.textContent = 'FLAPPY FURY';
        usernameText.textContent = 'Invitado';
        loginBtn.classList.remove('hidden');
        registerBtn.classList.remove('hidden');
        logoutBtn.classList.add('hidden');
    }
    updateLeaderboard(); // Actualiza la tabla de clasificación siempre
}

// --- MANEJO DE MODALES DE AUTENTICACIÓN ---
loginBtn.addEventListener('click', () => loginModal.classList.remove('hidden'));
registerBtn.addEventListener('click', () => registerModal.classList.remove('hidden'));
logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('currentUser');
    updateUIForAuthState();
});

[loginModal, registerModal].forEach(modal => {
    modal.querySelector('.modal-close-btn').addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });
});

// --- LÓGICA DE REGISTRO (CONECTADA AL BACKEND) ---
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;

    if (!username || !password) {
        alert('Por favor, completa todos los campos.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            // Si el servidor responde con un error (ej: usuario ya existe)
            throw new Error(data.message || 'Algo salió mal');
        }

        // Si el registro es exitoso
        alert('¡Cuenta creada con éxito! Ahora puedes iniciar sesión.');
        registerModal.classList.add('hidden');
        registerForm.reset();

    } catch (error) {
        // Muestra el mensaje de error del servidor o uno genérico
        alert(`Error al registrar: ${error.message}`);
    }
});


// --- LÓGICA DE INICIO DE SESIÓN (CONECTADA AL BACKEND) ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        alert('Por favor, completa todos los campos.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Credenciales incorrectas');
        }

        // Guardar el token y el nombre de usuario
        sessionStorage.setItem('authToken', data.token);
        sessionStorage.setItem('currentUser', username); // Guardamos el username para mostrarlo fácilmente

        updateUIForAuthState();
        loginModal.classList.add('hidden');
        loginForm.reset();

    } catch (error) {
        alert(`Error al iniciar sesión: ${error.message}`);
    }
});


// --- LÓGICA DE LA TABLA DE CLASIFICACIÓN (CONECTADA AL BACKEND) ---
async function saveScore(score) {
    const token = sessionStorage.getItem('authToken');
    if (!token) {
        console.log("No hay sesión iniciada, no se guarda la puntuación.");
        return; 
    }

    try {
        const response = await fetch(`${API_URL}/api/game/submit-score`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Así se envían los tokens para rutas protegidas
            },
            body: JSON.stringify({ score })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'No se pudo guardar la puntuación');
        }
        
        console.log('Puntuación guardada con éxito en el servidor.');
        updateLeaderboard(); // Actualizar la tabla después de guardar

    } catch (error) {
        console.error("Error al guardar la puntuación:", error.message);
    }
}

async function updateLeaderboard() {
    try {
        const response = await fetch(`${API_URL}/api/leaderboard`);
        if (!response.ok) throw new Error('No se pudo cargar la clasificación');
        
        const topScores = await response.json();

        leaderboardList.innerHTML = '';
        if (topScores.length === 0) {
            leaderboardList.innerHTML = '<li><span>Aún no hay puntuaciones.</span></li>';
        } else {
            topScores.slice(0, 3).forEach((record, index) => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${index + 1}. ${record.username}</span> <span class="score">${record.score}</span>`;
                leaderboardList.appendChild(li);
            });
        }
    } catch (error) {
        console.error("Error al cargar la clasificación:", error.message);
        leaderboardList.innerHTML = '<li><span>Error al cargar datos.</span></li>';
    }
}


// ==============================================================================
// LÓGICA DE PERSONALIZACIÓN 
// ==============================================================================
const customizeModal = document.getElementById('modal-customize');
const openCustomizeBtn = document.getElementById('change-skin-btn');
const closeCustomizeBtn = customizeModal.querySelector('.modal-close-btn');
const saveSkinBtn = document.getElementById('save-skin-btn');
const skinOptions = customizeModal.querySelectorAll('.skin-option');
const lobbyBirdPreview = document.getElementById('bird-preview');
const modalBirdPreview = document.getElementById('modal-bird-preview');

let tempSkinKey = ''; 

function openModal() {
    tempSkinKey = localStorage.getItem('myGameBirdSkinKey') || 'bird';
    updateModalSelection(tempSkinKey); 
    customizeModal.classList.remove('hidden');
}

function closeModal() {
    customizeModal.classList.add('hidden');
}

function updateModalSelection(skinKey) {
    skinOptions.forEach(option => {
        const isSelected = option.dataset.skinKey === skinKey;
        option.classList.toggle('active', isSelected);
        if (isSelected) {
            const previewClass = option.dataset.skinPreviewClass;
            modalBirdPreview.className = ''; 
            modalBirdPreview.classList.add(previewClass);
        }
    });
}

function applySkinToLobby(skinKey) {
    const option = document.querySelector(`.skin-option[data-skin-key="${skinKey}"]`);
    if (option) {
        const previewClass = option.dataset.skinPreviewClass;
        lobbyBirdPreview.className = ''; 
        lobbyBirdPreview.classList.add(previewClass);
    }
}

openCustomizeBtn.addEventListener('click', openModal);
closeCustomizeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeModal(); });
customizeModal.addEventListener('click', (e) => { if (e.target === customizeModal) closeModal(); });
skinOptions.forEach(option => {
    option.addEventListener('click', (e) => {
        e.stopPropagation(); 
        tempSkinKey = option.dataset.skinKey; 
        updateModalSelection(tempSkinKey); 
    });
});
saveSkinBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    localStorage.setItem('myGameBirdSkinKey', tempSkinKey);
    applySkinToLobby(tempSkinKey);
    closeModal();
});

function initializeSkin() {
    const savedSkinKey = localStorage.getItem('myGameBirdSkinKey') || 'bird';
    applySkinToLobby(savedSkinKey);
}


// =============================================
//         LÓGICA DE PANTALLA COMPLETA
// =============================================
const enterFullscreenBtn = document.getElementById('enter-fullscreen');
const exitFullscreenBtn = document.getElementById('exit-fullscreen');
const gameContainer = document.documentElement;
enterFullscreenBtn.addEventListener('click', () => { if (gameContainer.requestFullscreen) { gameContainer.requestFullscreen(); } else if (gameContainer.mozRequestFullScreen) { gameContainer.mozRequestFullScreen(); } else if (gameContainer.webkitRequestFullscreen) { gameContainer.webkitRequestFullscreen(); } else if (gameContainer.msRequestFullscreen) { gameContainer.msRequestFullscreen(); } });
exitFullscreenBtn.addEventListener('click', () => { if (document.exitFullscreen) { document.exitFullscreen(); } else if (document.mozCancelFullScreen) { document.mozCancelFullScreen(); } else if (document.webkitExitFullscreen) { document.webkitExitFullscreen(); } else if (document.msExitFullscreen) { document.msExitFullscreen(); } });
document.addEventListener('fullscreenchange', () => { if (document.fullscreenElement) { enterFullscreenBtn.style.display = 'none'; exitFullscreenBtn.style.display = 'block'; } else { enterFullscreenBtn.style.display = 'block'; exitFullscreenBtn.style.display = 'none'; } });

// --- Carga inicial al cargar la página ---
document.addEventListener('DOMContentLoaded', () => { 
    updateUIForAuthState();
    initializeSkin();
});

// =============================================
//         CÓDIGO DEL JUEGO CON PHASER
// =============================================
class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'mainScene' });
        this.GRAVITY_STRENGTH = 900;
        this.FLAP_VELOCITY = -330;
        this.INITIAL_PIPE_SPEED = -200;
        this.MAX_PIPE_SPEED = -350;
        this.INITIAL_PIPE_GAP = 140;
        this.MIN_PIPE_GAP = 120;
        this.PIPE_VERTICAL_MOVEMENT = 80;
        this.INITIAL_TWEEN_DURATION = 3000;
        this.MIN_TWEEN_DURATION = 1400;
        this.INITIAL_WALL_AMPLITUDE = 50;
        this.WALL_AMPLITUDE_INCREMENT = 20;
        this.MAX_WALL_AMPLITUDE = 100;
    }

    init(data) {
        this.startOptions = data || {};
        this.selectedSkinKey = localStorage.getItem('myGameBirdSkinKey') || 'bird';
    }

    preload() {
        this.load.image('background', 'assets/fondo.jpg');
        this.load.image('pipe-body', 'assets/tuberia-cuerpo.png');
        this.load.image('pipe-cap', 'assets/tuberia-borde.png');
        this.load.image('game-over-img', 'assets/game-over.png');
        this.load.spritesheet('restart-button', 'assets/boton-restart-sheet.png', { frameWidth: 79, frameHeight: 30 });
        
        this.load.spritesheet('bird', 'assets/pajaro-anim.png', { frameWidth: 90, frameHeight: 63 });
        this.load.spritesheet('bird-red', 'assets/pajaro-rojo-anim.png', { frameWidth: 90, frameHeight: 63 });
        this.load.spritesheet('bird-blue', 'assets/pajaro-azul-anim.png', { frameWidth: 90, frameHeight: 63 });
        
        this.load.spritesheet('fireball_projectile', 'assets/fireball_projectile_anim.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('death_effect', 'assets/death_effect_anim.png', { frameWidth: 64, frameHeight: 64 });
        this.load.audio('flap_sfx', 'assets/sounds/flap_sound.ogg');
        this.load.audio('background_music', 'assets/musica-fondo.OGG');
    }

    create() {
        this.isFirstWallCleared = false;
        this.isWaitingForArrowTarget = false;
        this.arrowTargetPipe = null;
        if (this.guideArrow) { this.guideArrow.destroy(); this.guideArrow = null; }

        this.cameras.main.resetFX();
        this.cameras.main.scrollX = 0; this.cameras.main.scrollY = 0; this.cameras.main.zoom = 1; this.cameras.main.rotation = 0;
        
        this.gameStarted = false; this.gameOver = false;
        this.isWallEventActive = false; this.isProjectileEventActive = false;
        this.fireballFromLeftNext = false; this.isRotated = false;
        this.projectileEventCount = 0;
        this.score = 0;
        this.isImmortal = false;

        this.currentPipeSpeed = this.INITIAL_PIPE_SPEED;
        this.currentPipeGap = this.INITIAL_PIPE_GAP;
        this.currentTweenDuration = this.INITIAL_TWEEN_DURATION;
        this.currentWallAmplitude = this.INITIAL_WALL_AMPLITUDE;
        this.nextWallScore = 30;
        this.nextProjectileScore = 10;
        
        const { width, height } = this.cameras.main;

        this.background = this.add.tileSprite(width / 2, height / 2, width, height, 'background').setOrigin(0.5).setScrollFactor(0).setDepth(-1);
        this.background.tileScaleX = height / this.textures.get('background').getSourceImage().height;
        this.background.tileScaleY = this.background.tileScaleX;

        this.pipes = this.physics.add.group();
        this.fireballs = this.physics.add.group();

        this.bird = this.physics.add.sprite(100, 300, this.selectedSkinKey);
        
        if (!this.sound.get('background_music') || !this.sound.get('background_music').isPlaying) {
            this.sound.play('background_music', { loop: true, volume: 0.4 });
        }
        
        this.anims.create({ key: 'flap', frames: this.anims.generateFrameNumbers(this.selectedSkinKey, { start: 0, end: 1 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'burn', frames: this.anims.generateFrameNumbers('fireball_projectile', { start: 0, end: 5 }), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'puff', frames: this.anims.generateFrameNumbers('death_effect', { start: 0, end: 11 }), frameRate: 24, repeat: 0 });
        
        this.bird.setFrame(0).setDisplaySize(72, 50).body.setSize(48, 36);
        this.bird.setCollideWorldBounds(true).body.onWorldBounds = true;
        this.bird.body.setAllowGravity(false);
        
        this.getReadyText = this.add.text(width / 2, height / 3, '¡Prepárate!', { fontSize: '48px', fill: '#fff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setScrollFactor(0);
        this.birdFloat = this.tweens.add({ targets: this.bird, y: 310, ease: 'Sine.easeInOut', duration: 400, yoyo: true, repeat: -1 });
        
        this.physics.world.on('worldbounds', (body) => { if (body.gameObject === this.bird) this.hitPipe(); });
        this.pipeCollider = this.physics.add.collider(this.bird, this.pipes, this.hitPipe, null, this);
        this.fireballCollider = this.physics.add.collider(this.bird, this.fireballs, this.hitPipe, null, this);
        
        this.input.on('pointerdown', () => this.flap());
        this.input.keyboard.on('keydown-SPACE', () => this.flap());
        
        this.scoreText = this.add.text(width / 2, 50, '', { fontSize: '48px', fill: '#fff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setAlpha(0).setDepth(10).setScrollFactor(0);
        this.gameOverContainer = this.createGameOverScreen();
        
        const textStyle = { fontSize: '16px', fill: '#ffffff', backgroundColor: '#00000080', padding: { x: 5, y: 3 } };
        this.immortalText = this.add.text(10, 10, 'Inmortal: OFF (I)', textStyle).setScrollFactor(0).setDepth(100);
        this.debugText = this.add.text(10, 30, 'Debug: OFF (D)', textStyle).setScrollFactor(0).setDepth(100);

        this.input.keyboard.on('keydown-I', () => { this.isImmortal = !this.isImmortal; this.immortalText.setText(`Inmortal: ${this.isImmortal ? 'ON' : 'OFF'} (I)`).setColor(this.isImmortal ? '#ff0000' : '#ffffff'); this.bird.setAlpha(this.isImmortal ? 0.5 : 1.0); this.pipeCollider.active = !this.isImmortal; this.fireballCollider.active = !this.isImmortal; this.bird.setCollideWorldBounds(!this.isImmortal); });
        this.input.keyboard.on('keydown-D', () => { this.physics.world.debugGraphic.setVisible(!this.physics.world.debugGraphic.visible); this.physics.world.drawDebug = this.physics.world.debugGraphic.visible; this.debugText.setText(`Debug: ${this.physics.world.drawDebug ? 'ON' : 'OFF'} (D)`).setColor(this.physics.world.drawDebug ? '#ff00ff' : '#ffffff'); });

        this.scale.on('resize', this.resizeAllElements, this);
        this.physics.world.drawDebug = false;
        this.physics.world.debugGraphic.setVisible(false);

        this.applyDebugOptions();
    }
    
    startGame() {
        if (this.gameStarted) return;
        this.gameStarted = true;
        this.bird.body.setAllowGravity(true).setGravityY(this.GRAVITY_STRENGTH);
        if (this.birdFloat) this.birdFloat.stop();
        if (this.getReadyText) this.getReadyText.destroy();
        this.scoreText.setAlpha(1).setText(this.score);
        this.bird.anims.play('flap', true);
        this.pipeTimer = this.time.addEvent({ delay: 1500, callback: this.addPipeRow, callbackScope: this, loop: true });
    }

    applyDebugOptions() {
        if (!this.startOptions || Object.keys(this.startOptions).length === 0) return;
        this.score = this.startOptions.startScore || this.score;
        const event = this.startOptions.startEvent;
        if (event !== 'none') { this.startGame(); }
        switch(event) {
            case 'projectile': this.score = Math.max(this.score, 10); this.nextProjectileScore = this.score; this.updateScoreAndDifficulty(); break;
            case 'wall': this.score = Math.max(this.score, 30); this.nextWallScore = this.score; this.updateScoreAndDifficulty(); break;
            case 'zoom':
                this.score = Math.max(this.score, 31);
                this.cameras.main.startFollow(this.bird, true, 0.1, 0.1);
                this.cameras.main.zoom = 1.3;
                this.setupFirstArrowGuide();
                break;
        }
        this.scoreText.setText(this.score);
    }
    
    flap() {
        if (this.gameOver) return;
        this.sound.play('flap_sfx');
        if (!this.gameStarted) { this.startGame(); }
        this.bird.setVelocityY(this.FLAP_VELOCITY);
        this.bird.setAngle(-30);
    }

    update() {
        if (this.gameOver || !this.gameStarted) return;
        this.background.tilePositionX += 0.5;
        if (this.bird.body.velocity.y < 0) { this.bird.angle = Phaser.Math.Clamp(this.bird.angle - 5, -30, 90); } else if (this.bird.angle < 90) { this.bird.angle += 2.5; }
        
        if (this.guideArrow) {
            this.guideArrow.setPosition(this.bird.x + 40, this.bird.y);
            
            if (this.arrowTargetPipe) {
                const distance = this.arrowTargetPipe.x - this.bird.x;
                if (!this.arrowTargetPipe.active || distance < 250) {
                    this.guideArrow.destroy();
                    this.guideArrow = null;
                    this.arrowTargetPipe = null;
                } else {
                    const targetY = this.arrowTargetPipe.y + (this.currentPipeGap / 2);
                    const angle = Phaser.Math.Angle.Between(this.guideArrow.x, this.guideArrow.y, this.arrowTargetPipe.x, targetY);
                    this.guideArrow.setRotation(angle);
                }
            }
        }
        
        this.fireballs.getChildren().forEach(fireball => { if (fireball.x < this.cameras.main.scrollX - 100 || fireball.x > this.cameras.main.scrollX + this.cameras.main.width + 100) { fireball.destroy(); } });
    }

    addPipeRow() {
        const { width, height } = this.cameras.main;
        const pipeWidth = 90;
        const spawnX = width + this.cameras.main.scrollX;
        const gap = this.currentPipeGap;
        const verticalMargin = height * 0.18; 
        const pipeY = Phaser.Math.Between(verticalMargin + (gap / 2), height - verticalMargin - (gap / 2));
        const isMover = this.score >= 10 && Phaser.Math.Between(0, 1) === 1;
        
        const newPipePair = this.createPipePair(spawnX, pipeY, gap, pipeWidth, isMover);

        if (this.isWaitingForArrowTarget) {
            this.arrowTargetPipe = newPipePair.upperCap;
            this.isWaitingForArrowTarget = false;
        }

        const scoreZone = this.add.zone(spawnX + (pipeWidth / 2), 0, 5, height).setOrigin(0, 0);
        this.physics.world.enable(scoreZone);
        scoreZone.body.setAllowGravity(false).setVelocityX(this.currentPipeSpeed);
        this.physics.add.overlap(this.bird, scoreZone, () => {
            scoreZone.destroy(); this.score++; this.scoreText.setText(this.score); this.updateScoreAndDifficulty();
        });
    }
    
    createPipePair(x, y, gap, width, isMover) {
        const capHeight = 30;
        const bodyWidth = 88;
    
        const upperBody = this.pipes.create(x, y - gap / 2 - capHeight, 'pipe-body').setOrigin(0, 1);
        const upperCap = this.pipes.create(x - (width - bodyWidth) / 2, y - gap / 2, 'pipe-cap').setOrigin(0, 1);
        const lowerBody = this.pipes.create(x, y + gap / 2 + capHeight, 'pipe-body').setOrigin(0, 0);
        const lowerCap = this.pipes.create(x - (width - bodyWidth) / 2, y + gap / 2, 'pipe-cap').setOrigin(0, 0);
        
        const setupPart = (part, isBody, isUpper) => {
            part.setImmovable(true).body.setAllowGravity(false).setVelocityX(this.currentPipeSpeed);
            if (isBody) {
                let height = isUpper ? part.y : this.cameras.main.height - part.y;
                part.setDisplaySize(bodyWidth, height + this.cameras.main.height);
            } else {
                part.setDisplaySize(width, capHeight);
            }
            if (isUpper) {
                part.setFlipY(true);
            }
        };

        setupPart(upperBody, true, true);
        setupPart(upperCap, false, true);
        setupPart(lowerBody, true, false);
        setupPart(lowerCap, false, false);

        if (isMover) {
            const movingParts = [upperBody, upperCap, lowerBody, lowerCap];
            this.tweens.add({
                targets: movingParts, y: `+=${Phaser.Math.RND.pick([-1, 1]) * this.PIPE_VERTICAL_MOVEMENT}`,
                duration: this.currentTweenDuration, ease: 'Sine.easeInOut', yoyo: true, repeat: -1
            });
        }
        return { upperCap, lowerCap };
    }


    updateScoreAndDifficulty() {
        if (this.isWallEventActive || this.isProjectileEventActive) return;
        if (this.score >= this.nextProjectileScore) { this.nextProjectileScore += 10; this.startProjectileEvent(); return; }
        if (this.score >= this.nextWallScore) { this.nextWallScore += 30; this.isWallEventActive = true; this.generatePipeWall(); return; }
        if (this.currentPipeGap > this.MIN_PIPE_GAP) this.currentPipeGap = Math.max(this.MIN_PIPE_GAP, this.INITIAL_PIPE_GAP - Math.floor(this.score / 5) * 3);
        if (this.currentTweenDuration > this.MIN_TWEEN_DURATION) this.currentTweenDuration = Math.max(this.MIN_TWEEN_DURATION, this.INITIAL_TWEEN_DURATION - this.score * 40);
    }

    startProjectileEvent() {
        this.isProjectileEventActive = true; this.pipeTimer.paused = true; this.projectileEventCount++;
        this.cameras.main.stopFollow();
        this.tweens.add({ targets: this.cameras.main, zoom: 1, scrollY: 0, duration: 500, ease: 'Sine.easeInOut' });
        this.tweens.add({ targets: this.cameras.main, scrollX: this.bird.x - this.cameras.main.width / 2, duration: 800, ease: 'Power2' });
        const startTheFireballs = () => {
            const eventDuration = 10000; const fireballInterval = 550; const fireballSpeed = 320;
            const launchFireball = () => {
                if (this.gameOver) return;
                const birdY = this.bird.y;
                const createFireball = (fromLeft, forcedY) => {
                    let spawnY = forcedY !== undefined ? forcedY : Phaser.Math.Between(birdY - 100, birdY + 100);
                    spawnY = Phaser.Math.Clamp(spawnY, 50, this.cameras.main.height - 50);
                    const spawnX = fromLeft ? this.cameras.main.scrollX - 50 : this.cameras.main.scrollX + this.cameras.main.width + 50;
                    const velocityX = fromLeft ? fireballSpeed : -fireballSpeed;
                    const fireball = this.fireballs.create(spawnX, spawnY, 'fireball_projectile');
                    fireball.body.setAllowGravity(false).setVelocityX(velocityX);
                    fireball.setDisplaySize(80, 80).body.setCircle(22);
                    fireball.anims.play('burn', true).setFlipX(!fromLeft);
                };
                if (this.projectileEventCount <= 2) { createFireball(this.fireballFromLeftNext); } else {
                    const centerPoint = Phaser.Math.Between(birdY - 50, birdY + 50);
                    createFireball(true, centerPoint - (185 / 2));
                    createFireball(false, centerPoint + (185 / 2));
                }
            };
            const fireballTimer = this.time.addEvent({ delay: fireballInterval, callback: launchFireball, loop: true });
            this.time.delayedCall(eventDuration, () => {
                fireballTimer.remove();
                this.time.delayedCall(2000, () => {
                    if (this.gameOver) return;
                    this.tweens.add({ targets: this.cameras.main, scrollX: 0, duration: 800, ease: 'Power2',
                        onComplete: () => {
                            if (this.gameOver) return;
                            if (this.projectileEventCount <= 2) { this.fireballFromLeftNext = !this.fireballFromLeftNext; }
                            this.isProjectileEventActive = false; this.rotateViewAfterEvent(); this.pipeTimer.paused = false;
                            this.score++; this.scoreText.setText(this.score); this.updateScoreAndDifficulty();
                        }
                    });
                });
            });
        };
        const pipeCheckTimer = this.time.addEvent({ delay: 100, loop: true, callback: () => { if (this.pipes.getChildren().every(p => p.x < this.cameras.main.scrollX)) { pipeCheckTimer.remove(); startTheFireballs(); } } });
    }

    rotateViewAfterEvent() {
        this.isRotated = !this.isRotated; const targetRotation = this.isRotated ? Math.PI : 0;
        this.tweens.add({ targets: this.cameras.main, rotation: targetRotation, duration: 600, ease: 'Sine.easeInOut' });
    }

    generatePipeWall() {
        this.pipeTimer.paused = true;
        const startTheWall = () => {
            const wallPipeCount = 15; const pipeWidth = 90; const gap = 140;
            const centerY = this.cameras.main.height / 2; const direction = Phaser.Math.RND.pick([-1, 1]);
            for (let i = 0; i < wallPipeCount; i++) {
                this.time.delayedCall(i * 150, () => {
                    if (this.gameOver) return;
                    const spawnX = this.cameras.main.width + this.cameras.main.scrollX;
                    const progress = i / (wallPipeCount - 1);
                    const easedValue = Phaser.Math.Easing.Sine.InOut(progress);
                    const offset = (-this.currentWallAmplitude + (easedValue * this.currentWallAmplitude * 2)) * direction;
                    this.createPipePair(spawnX, centerY + offset, gap, pipeWidth, false);
                });
            }
            this.time.delayedCall(wallPipeCount * 150 + 1000, () => {
                if (this.gameOver) return;
                this.currentWallAmplitude = Math.min(this.MAX_WALL_AMPLITUDE, this.currentWallAmplitude + this.WALL_AMPLITUDE_INCREMENT);
                const scoreZone = this.add.zone(this.cameras.main.width + this.cameras.main.scrollX + 200, 0, 5, this.cameras.main.height).setOrigin(0, 0);
                this.physics.world.enable(scoreZone);
                scoreZone.body.setAllowGravity(false).setVelocityX(this.currentPipeSpeed);
                this.physics.add.overlap(this.bird, scoreZone, () => {
                    scoreZone.destroy(); this.score++; this.scoreText.setText(this.score);
                    this.isWallEventActive = false; this.nextProjectileScore = this.score + 10;
                    this.cameras.main.startFollow(this.bird, true, 0.1, 0.1);
                    this.tweens.add({ targets: this.cameras.main, zoom: 1.3, duration: 500, ease: 'Sine.easeInOut' });
                    if (!this.isFirstWallCleared) { this.setupFirstArrowGuide(); }
                    this.time.delayedCall(1500, () => { if (this.gameOver) return; this.pipeTimer.paused = false; this.updateScoreAndDifficulty(); });
                });
            });
        };
        const pipeCheckTimer = this.time.addEvent({ delay: 100, loop: true, callback: () => { if (this.pipes.getChildren().every(p => p.x < this.cameras.main.scrollX)) { pipeCheckTimer.remove(); startTheWall(); } } });
    }
    
    setupFirstArrowGuide() {
        this.isFirstWallCleared = true;
        this.isWaitingForArrowTarget = true;
        this.guideArrow = this.add.graphics({ lineStyle: { width: 2, color: 0x000000 }, fillStyle: { color: 0x00ff00 } });
        this.guideArrow.fillTriangle(0, -8, 20, 0, 0, 8);
        this.guideArrow.setDepth(200).setVisible(true).setRotation(0);
    }

    hitPipe() {
        if (this.gameOver) return; 
        this.gameOver = true;
        this.time.removeAllEvents();
        this.bird.setVisible(false);
        const deathSprite = this.add.sprite(this.bird.x, this.bird.y, 'death_effect').setDisplaySize(60, 59).play('puff');
        deathSprite.on('animationcomplete', () => deathSprite.destroy());
        this.bird.anims.stop();
        
        // Guardar la puntuación usando la nueva función
        if (!this.isImmortal) { 
            saveScore(this.score);
        }

        this.physics.pause();
        if (this.guideArrow) { this.guideArrow.destroy(); this.guideArrow = null; }
        this.arrowTargetPipe = null;

        this.cameras.main.flash(250, 255, 255, 255); 

        this.cameras.main.stopFollow();
        this.tweens.add({
            targets: this.cameras.main,
            zoom: 1,
            scrollX: 0,
            scrollY: 0,
            rotation: 0,
            duration: 250, 
            ease: 'Sine.easeInOut',
            onComplete: () => {
                this.showGameOverScreen();
            }
        });
    }
    
    createGameOverScreen() {
        const { width, height } = this.cameras.main;
        const container = this.add.container(width / 2, height / 2).setAlpha(0).setDepth(100).setScrollFactor(0);
        const gameOverImage = this.add.image(0, -60, 'game-over-img').setOrigin(0.5);
        const scoreBoard = this.add.text(0, 20, '', { fontSize: '28px', fill: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
        
        const restartButton = this.add.sprite(0, 90, 'restart-button').setOrigin(0.5).setInteractive({ useHandCursor: true });
        restartButton.on('pointerover', () => restartButton.setFrame(1))
                     .on('pointerout', () => restartButton.setFrame(0))
                     .on('pointerdown', () => {
                         restartButton.setFrame(2);
                         this.time.delayedCall(100, () => this.scene.start('mainScene', this.startOptions));
                     });

        const backToHomeButton = this.add.text(0, 140, 'Volver al Inicio', {
            fontSize: '18px',
            fontFamily: 'Roboto',
            fill: '#E0E0E0',
            backgroundColor: '#1C1C1E',
            padding: { x: 15, y: 8 },
            align: 'center'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        backToHomeButton.on('pointerover', () => backToHomeButton.setBackgroundColor('#333'))
                        .on('pointerout', () => backToHomeButton.setBackgroundColor('#1C1C1E'))
                        .on('pointerdown', () => {
                            document.body.classList.remove('game-active');
                            const gameView = document.getElementById('game-view');
                            const lobbyView = document.getElementById('lobby-view');
                            if (gameView) gameView.style.display = 'none';
                            if (lobbyView) lobbyView.style.display = 'block';

                            // Actualizar UI al volver al lobby
                            updateUIForAuthState();
                            
                            this.sys.game.destroy(true);
                            phaserGame = null;
                        });
        
        container.add([gameOverImage, scoreBoard, restartButton, backToHomeButton]); 
        return container;
    }

    showGameOverScreen() {
        this.gameOverContainer.getAt(1).setText(`Puntuación: ${this.score}`);
        this.add.tween({ targets: this.gameOverContainer, alpha: 1, duration: 300, ease: 'Power2' });
    }

    resizeAllElements(gameSize) {
        const { width, height } = gameSize;
        this.background.setPosition(width / 2, height / 2).setSize(width, height);
        this.background.tileScaleX = height / this.textures.get('background').getSourceImage().height;
        this.background.tileScaleY = this.background.tileScaleX;
        if (this.scoreText) this.scoreText.setX(width / 2);
        if (this.gameOverContainer) this.gameOverContainer.setPosition(width / 2, height / 2);
        if(this.getReadyText) this.getReadyText.setPosition(width / 2, height / 3);
    }
}

const config = {
    type: Phaser.AUTO,
    parent: 'phaser-container',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 400,
        height: 600,
    },
    physics: {
        default: 'arcade',
        arcade: { 
            gravity: { y: 0 }, 
            debug: true 
        }
    },
    scene: null
};