import * as THREE from "three";

class MemoryGame {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer();
    this.cards = [];
    this.flippedCards = [];
    this.matches = 0;
    this.isAnimating = false;
    this.gameStarted = false;
    this.timeRemaining = 60;
    this.timerInterval = null;
    this.unflipTimeout = null;

    this.init();
  }

  init() {
    // Setup renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document
      .getElementById("game-container")
      .appendChild(this.renderer.domElement);

    // Setup camera
    this.camera.position.z = 15;

    // Not Setup lights
    // const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    // this.scene.add(ambientLight);

    // const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    // directionalLight.position.set(10, 10, 10);
    // this.scene.add(directionalLight);

    // Setup event listeners
    window.addEventListener("resize", () => this.onWindowResize());
    this.renderer.domElement.addEventListener("click", (event) =>
      this.onCardClick(event)
    );

    // Setup start button
    document
      .getElementById("start-button")
      .addEventListener("click", () => this.startGame());

    // Start animation loop
    this.animate();
  }

  startGame() {
    document.getElementById("score").textContent = `Pairs Found: 0`;

    const numPairs = parseInt(document.getElementById("pairs-input").value);
    if (numPairs < 5 || numPairs > 26) {
      alert("Please enter a number between 5 and 26");
      return;
    }

    // Clear existing cards
    this.cards.forEach((card) => this.scene.remove(card.mesh));
    this.cards = [];
    this.flippedCards = [];
    this.matches = 0;

    // Create new cards
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".slice(0, numPairs);
    const pairs = letters + letters;
    const shuffledPairs = this.shuffleArray(pairs.split("")).join("");

    // Calculate grid dimensions
    const totalCards = numPairs * 2;
    const columns = Math.ceil(Math.sqrt(totalCards));
    const rows = Math.ceil(totalCards / columns);

    // Create and position cards
    for (let i = 0; i < totalCards; i++) {
      const row = Math.floor(i / columns);
      const col = i % columns;
      const x = (col - (columns - 1) / 2) * 2.2;
      const y = (row - (rows - 1) / 2) * 3;

      this.createCard(x, y, shuffledPairs[i], i);
    }

    // Hide start screen and start timer
    document.getElementById("start-screen").style.display = "none";
    this.timeRemaining = Math.max(30, Math.floor(totalCards * 3));
    document.getElementById(
      "timer"
    ).textContent = `Time: ${this.timeRemaining}`;

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => this.updateTimer(), 1000);

    this.gameStarted = true;
  }

  createCard(x, y, letter, index) {
    // Create card geometry
    const geometry = new THREE.PlaneGeometry(2, 2.8);
    const material = new THREE.MeshBasicMaterial({
      color: 0x2196f3,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 0);

    // Create text texture for the letter
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    context.translate(canvas.width / 2, canvas.height / 2);
    context.scale(-1, 1);
    context.translate(-canvas.width / 2, -canvas.height / 2);
    context.fillStyle = "white";
    context.fillRect(0, 0, 128, 128);
    context.fillStyle = "black";
    context.font = "bold 80px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(letter, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const backMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });

    const card = {
      mesh,
      letter,
      index,
      isFlipped: false,
      frontMaterial: material,
      backMaterial,
    };

    this.cards.push(card);
    this.scene.add(mesh);
  }

  flipCard(card) {
    if (this.isAnimating || card.isFlipped) {
      return;
    }

    // If two cards are already flipped
    if (this.flippedCards.length === 2) {
      if (this.unflipTimeout) {
        clearTimeout(this.unflipTimeout);
        this.unflipTimeout = null;
      }

      // Check if the two flipped cards match
      const [card1, card2] = this.flippedCards;
      if (card1.letter === card2.letter) {
        this.flippedCards = [];
      } else {
        this.unflipCards(card1, card2);
      }
    }

    this.isAnimating = true;
    card.isFlipped = true;

    // Flip animation
    const duration = 500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 0.5) {
        card.mesh.rotation.y = progress * Math.PI;
      } else {
        if (progress >= 0.5 && card.mesh.material !== card.backMaterial) {
          card.mesh.material = card.backMaterial;
        }
        card.mesh.rotation.y = Math.PI + (progress - 1) * Math.PI;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
        this.flippedCards.push(card);
        if (this.flippedCards.length === 2) {
          this.checkMatch();
        }
      }
    };

    animate();
  }

  checkMatch() {
    const [card1, card2] = this.flippedCards;

    if (card1.letter === card2.letter) {
      this.matches++;
      document.getElementById(
        "score"
      ).textContent = `Pairs Found: ${this.matches}`;

      if (this.matches === this.cards.length / 2) {
        this.endGame(true);
      }
    } else {
      this.unflipTimeout = setTimeout(() => {
        if (
          this.flippedCards.includes(card1) &&
          this.flippedCards.includes(card2)
        ) {
          this.unflipCards(card1, card2);
        }
      }, 1000);
    }
  }

  unflipCards(card1, card2) {
    this.isAnimating = true;
    const duration = 500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 0.5) {
        card1.mesh.rotation.y = progress * Math.PI;
        card2.mesh.rotation.y = progress * Math.PI;
      } else {
        if (progress >= 0.5 && card1.mesh.material !== card1.frontMaterial) {
          card1.mesh.material = card1.frontMaterial;
          card2.mesh.material = card2.frontMaterial;
        }
        card1.mesh.rotation.y = Math.PI + (progress - 1) * Math.PI;
        card2.mesh.rotation.y = Math.PI + (progress - 1) * Math.PI;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        card1.isFlipped = false;
        card2.isFlipped = false;
        this.isAnimating = false;
        this.flippedCards = [];
      }
    };

    animate();
  }

  onCardClick(event) {
    if (!this.gameStarted || this.isAnimating) return;

    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const intersects = raycaster.intersectObjects(
      this.cards.map((card) => card.mesh)
    );

    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      const card = this.cards.find((c) => c.mesh === mesh);
      this.flipCard(card);
    }
  }

  updateTimer() {
    this.timeRemaining--;
    document.getElementById(
      "timer"
    ).textContent = `Time: ${this.timeRemaining}`;

    if (this.timeRemaining <= 0) {
      clearInterval(this.timerInterval);
      this.endGame(false);
    }
  }

  endGame(won) {
    this.gameStarted = false;
    clearInterval(this.timerInterval);

    const message = won
      ? "Winner Winner Chicken Dinner!"
      : "It looks that we have a loser!";
    alert(message);
    document.getElementById("start-screen").style.display = "block";
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }
}

new MemoryGame();
