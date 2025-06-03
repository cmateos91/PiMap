document.addEventListener('DOMContentLoaded', () => {
  // Verificar sesión PiAuth
  PiAuth.checkSession().then(session => {
    if (!session.loggedIn) {
      window.location.href = 'index.html';
      return;
    }
    document.getElementById('userinfo').innerText = `Usuario: ${session.account}`;
  }).catch(_ => window.location.href = 'index.html');

  let currentTxid = null;
  let userAddress = null;
  let score = 0;
  let isPlaying = false;
  const stakeBtn = document.getElementById('stakeBtn');
  const gameSection = document.getElementById('game-section');
  const stakeSection = document.getElementById('stake-section');
  const resultSection = document.getElementById('result-section');
  const statusText = document.getElementById('statusText');
  const playAgainBtn = document.getElementById('playAgainBtn');
  const submitScoreBtn = document.getElementById('submitScoreBtn');
  const scoreDisplay = document.getElementById('scoreDisplay');
  const canvas = document.getElementById('dribbleCanvas');
  const ctx = canvas.getContext('2d');

  // Obtener dirección de usuario
  PiAuth.getProfile().then(profile => {
    userAddress = profile.address;
  }).catch(err => console.error('Error al obtener perfil:', err));

  // Stake y jugar
  stakeBtn.addEventListener('click', () => {
    stakeBtn.disabled = true;
    PiPayments.init({
      host: 'https://sandbox.minepi.com',
      appUrl: window.location.origin,
      amount: 0.01,
      onSuccess: (response) => {
        currentTxid = response.txid;
        stakeSection.style.display = 'none';
        gameSection.style.display = 'block';
        startGame();
      },
      onFailure: () => {
        alert('Pago fallido, intenta nuevamente.');
        stakeBtn.disabled = false;
      }
    });
  });

  // Lógica del juego Dribble
  function startGame() {
    isPlaying = true;
    score = 0;
    scoreDisplay.innerText = score;
    submitScoreBtn.style.display = 'none';
    statusText.innerText = '';

    let ball = { x: 150, y: 100, radius: 15, dy: 2 };
    const gravity = 0.1;

    function drawBall() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI*2);
      ctx.fillStyle = '#FFCC00';
      ctx.fill();
      ctx.closePath();
    }

    function update() {
      if (!isPlaying) return;
      ball.dy += gravity;
      ball.y += ball.dy;
      if (ball.y + ball.radius >= canvas.height) {
        isPlaying = false;
        endGame();
        return;
      }
      drawBall();
      requestAnimationFrame(update);
    }

    canvas.onclick = () => {
      if (!isPlaying) return;
      ball.dy = -3;
      score += 1;
      scoreDisplay.innerText = score;
    };

    update();
  }

  function endGame() {
    submitScoreBtn.style.display = 'block';
    statusText.innerText = `Partida terminada. Tu puntaje: ${score}`;
  }

  // Enviar puntaje al backend
  submitScoreBtn.addEventListener('click', () => {
    submitScoreBtn.disabled = true;
    fetch('/api/game/dribble/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        txid: currentTxid,
        score: score,
        user_address: userAddress
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        statusText.innerText = `Error: ${data.error}`;
      } else {
        statusText.innerText = 'Puntaje registrado. ¡Buena suerte!';
      }
    })
    .catch(err => {
      console.error('Error guardando puntaje:', err);
      statusText.innerText = 'Error en servidor. Intenta luego.';
    });
  });

  // Botón jugar otra vez
  playAgainBtn.addEventListener('click', () => {
    stakeSection.style.display = 'block';
    gameSection.style.display = 'none';
    resultSection.style.display = 'none';
    stakeBtn.disabled = false;
  });
});