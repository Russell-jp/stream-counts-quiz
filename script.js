let songs = [];
let artists = [];

let streamMode = null;
let artistMode = "single";
let selectedArtist = null;
let selectedArtists = [];
let currentRoundSongs = [];
let roundHistory = [];

async function loadData() {
    const songsResponse = await fetch("/api/songs");
    songs = await songsResponse.json();

    const artistsResponse = await fetch("/data/artists.json");
    artists = await artistsResponse.json();

    console.log("songs loaded:", songs.length);
    console.log("artists loaded:", artists.length);

    generateArtistGrid();
}

loadData();

const modeScreen = document.getElementById("mode-screen");
const artistScreen = document.getElementById("artist-screen");
const homeButton = document.getElementById("home-button");

const streamModeCards = document.querySelectorAll(".stream-mode-card");
const artistModeButtons = document.querySelectorAll(".artist-mode");
const gameScreen = document.getElementById("game-screen");
const songCards = document.querySelectorAll(".song-card");
const scoreElement = document.getElementById("score");
const pageArtist = document.querySelector(".page-artist");

const gameOverScreen = document.getElementById("game-over-screen");
const finalScore = document.getElementById("final-score");
const retryButton = document.getElementById("retry-button");
const modeButton = document.getElementById("mode-button");
const historyGrid = document.getElementById("history-grid");
const historyModal = document.getElementById("history-modal");
const historyModalRound = document.getElementById("history-modal-round");
const historyModalResult = document.getElementById("history-modal-result");
const historyModalCards = document.getElementById("history-modal-cards");
const closeHistoryButton = document.getElementById("close-history-button");

const artistStartPanel = document.querySelector(".artist-start-panel");
const selectedArtistsCount =
    document.getElementById("selected-artists-count");
const startMultipleButton =
    document.getElementById("start-multiple-button");
const selectAllArtistsButton =
    document.getElementById("select-all-artists");

const artistGrid = document.querySelector(".artist-grid");

let score = 0;
let roundLocked = false;

const correctSound = new Audio("audio/correct.mp3");
const incorrectSound = new Audio("audio/incorrect.mp3");

function generateArtistGrid() {
    artistGrid.innerHTML = "";

    [...artists]
        .sort((firstArtist, secondArtist) =>
            firstArtist.name.localeCompare(secondArtist.name)
        )
        .forEach(artist => {
            const card = document.createElement("button");

            card.classList.add("artist-card");
            card.dataset.artist = artist.name;

            card.innerHTML = `
            <img src="${artist.image}" alt="${artist.name}">
            <div class="artist-selected-badge">Selected</div>
            <span>${artist.name}</span>
        `;

            artistGrid.appendChild(card);
        });
}

function updateArtistSelectionUI() {
    document.querySelectorAll(".artist-card").forEach(card => {
        const isSelected = selectedArtists.includes(card.dataset.artist);
        card.classList.toggle("selected", isSelected);
    });

    const selectedCount = selectedArtists.length;

    selectedArtistsCount.textContent =
        `${selectedCount} artist${selectedCount === 1 ? "" : "s"} selected`;

    startMultipleButton.disabled = selectedCount < 2;

    selectAllArtistsButton.textContent =
        selectedCount === artists.length
            ? "Deselect All"
            : "Select All";
}

function resetArtistSelection() {
    selectedArtist = null;
    selectedArtists = [];

    updateArtistSelectionUI();
}

function startGame() {
    score = 0;
    roundHistory = [];
    roundLocked = false;
    scoreElement.textContent = "Score: 0";

    const streamLabel =
        streamMode === "dailyStreams"
            ? "Daily Streams"
            : "All-Time Streams";

    const artistLabel =
        artistMode === "multiple"
            ? `${selectedArtists.length} artists`
            : selectedArtist;

    pageArtist.textContent = `${streamLabel} / ${artistLabel}`;

    artistScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    generateRound();
}

function resetArtistModeButtons() {
    artistModeButtons.forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.mode === "single"
        );
    });
}

function getSongMeta(song) {
    if (artistMode === "multiple") {
        return `${song.artist} - ${song.album}`;
    }

    return song.album;
}

function generateRound() {
    roundLocked = false;

    songCards.forEach(card => {
        card.classList.remove("correct", "incorrect", "winner");
        card.querySelector(".stream-count").textContent = "";
    });

    const activeArtists =
        artistMode === "multiple"
            ? selectedArtists
            : [selectedArtist];

    const availableSongs = songs.filter(song =>
        activeArtists.includes(song.artist)
    );

    if (availableSongs.length < 2) {
        gameOver();
        return;
    }

    const firstIndex =
        Math.floor(Math.random() * availableSongs.length);

    let secondIndex =
        Math.floor(Math.random() * availableSongs.length);

    while (secondIndex === firstIndex) {
        secondIndex =
            Math.floor(Math.random() * availableSongs.length);
    }

    const firstSong = availableSongs[firstIndex];
    const secondSong = availableSongs[secondIndex];

    currentRoundSongs = [firstSong, secondSong];

    songCards[0].querySelector(".album-cover").src =
        firstSong.cover;

    songCards[1].querySelector(".album-cover").src =
        secondSong.cover;

    songCards[0].querySelector(".song-title").textContent =
        firstSong.title;

    songCards[1].querySelector(".song-title").textContent =
        secondSong.title;

    songCards[0].querySelector(".album-title").textContent =
        getSongMeta(firstSong);

    songCards[1].querySelector(".album-title").textContent =
        getSongMeta(secondSong);
}

function gameOver() {
    finalScore.textContent = `Your score: ${score}`;
    renderHistory();

    gameScreen.classList.add("hidden");
    gameOverScreen.classList.remove("hidden");
}

function renderHistory() {
    historyGrid.innerHTML = "";

    roundHistory.forEach(round => {
        const button = document.createElement("button");
        button.className = `history-card ${round.isCorrect ? "history-card-correct" : "history-card-incorrect"}`;
        button.type = "button";
        button.innerHTML = `
            <span class="history-card-number">Round ${round.roundNumber}</span>
            <span class="history-card-songs">${round.songs[0].title} <b>vs</b> ${round.songs[1].title}</span>
            <span class="history-card-result">${round.isCorrect ? "Correct" : "Incorrect"}</span>
        `;
        button.addEventListener("click", () => openHistoryDetails(round));
        historyGrid.appendChild(button);
    });
}

function openHistoryDetails(round) {
    historyModalRound.textContent = `Round ${round.roundNumber}`;
    historyModalResult.textContent = round.isCorrect
        ? "Correct choice"
        : "Incorrect choice";
    historyModalResult.className = `history-modal-result ${round.isCorrect ? "result-correct" : "result-incorrect"}`;
    historyModalCards.innerHTML = "";

    round.songs.forEach((song, index) => {
        const card = document.createElement("article");
        const isCorrectAnswer = index === round.correctIndex;
        const wasSelected = index === round.selectedIndex;
        card.className = `history-detail-card ${isCorrectAnswer ? "detail-correct" : ""}`;
        card.innerHTML = `
            <img src="${song.cover}" alt="${song.title} album cover">
            <div class="history-detail-copy">
                <h3>${song.title}</h3>
                <p>${getSongMeta(song)}</p>
                <strong>${song[round.streamMode].toLocaleString()} streams</strong>
                <span>${isCorrectAnswer ? "Higher streams" : wasSelected ? "Your choice" : "Other choice"}</span>
            </div>
        `;
        historyModalCards.appendChild(card);
    });

    historyModal.classList.remove("hidden");
}

function closeHistoryDetails() {
    historyModal.classList.add("hidden");
}

streamModeCards.forEach(card => {
    card.addEventListener("click", () => {
        streamMode = card.dataset.mode;

        modeScreen.classList.add("hidden");
        artistScreen.classList.remove("hidden");
    });
});

artistModeButtons.forEach(button => {
    button.addEventListener("click", () => {
        artistMode = button.dataset.mode;
        resetArtistSelection();

        artistModeButtons.forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        const isMultipleMode = artistMode === "multiple";

        artistStartPanel.classList.toggle(
            "hidden",
            !isMultipleMode
        );

        selectAllArtistsButton.classList.toggle(
            "hidden",
            !isMultipleMode
        );
    });
});

artistGrid.addEventListener("click", event => {
    const card = event.target.closest(".artist-card");

    if (!card) return;

    const artist = card.dataset.artist;

    if (artistMode === "multiple") {
        if (selectedArtists.includes(artist)) {
            selectedArtists = selectedArtists.filter(
                name => name !== artist
            );
        } else {
            selectedArtists.push(artist);
        }

        updateArtistSelectionUI();
        return;
    }

    selectedArtist = artist;
    selectedArtists = [artist];

    startGame();
});

selectAllArtistsButton.addEventListener("click", () => {
    const allArtists = artists.map(artist => artist.name);

    if (selectedArtists.length === allArtists.length) {
        selectedArtists = [];
    } else {
        selectedArtists = allArtists;
    }

    updateArtistSelectionUI();
});

startMultipleButton.addEventListener("click", () => {
    if (selectedArtists.length < 2) return;

    selectedArtist = null;
    startGame();
});

songCards.forEach(card => {
    card.addEventListener("click", () => {
        if (roundLocked) return;

        roundLocked = true;

        const clickedIndex =
            card === songCards[0] ? 0 : 1;

        const song = currentRoundSongs[clickedIndex];

        const otherCard =
            card === songCards[0]
                ? songCards[1]
                : songCards[0];

        const otherIndex = clickedIndex === 0 ? 1 : 0;
        const otherSong = currentRoundSongs[otherIndex];

        card.querySelector(".stream-count").textContent =
            song[streamMode].toLocaleString();

        otherCard.querySelector(".stream-count").textContent =
            otherSong[streamMode].toLocaleString();

        const isCorrect =
            song[streamMode] > otherSong[streamMode];

        roundHistory.push({
            roundNumber: roundHistory.length + 1,
            songs: currentRoundSongs,
            selectedIndex: clickedIndex,
            correctIndex: isCorrect ? clickedIndex : otherIndex,
            isCorrect,
            streamMode
        });

        if (isCorrect) {
            card.classList.add("correct");

            correctSound.currentTime = 0;
            correctSound.play();

            score++;
            scoreElement.textContent = `Score: ${score}`;
        } else {
            card.classList.add("incorrect");

            incorrectSound.currentTime = 0;
            incorrectSound.play();
        }

        const higherCard =
            isCorrect ? card : otherCard;

        higherCard.classList.add("winner");

        setTimeout(() => {
            if (isCorrect) {
                generateRound();
            } else {
                gameOver();
            }
        }, 3800);
    });
});

retryButton.addEventListener("click", () => {
    score = 0;
    roundHistory = [];
    scoreElement.textContent = "Score: 0";

    gameOverScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    generateRound();
});

function returnToHome() {
    score = 0;
    streamMode = null;
    artistMode = "single";
    selectedArtist = null;
    selectedArtists = [];
    currentRoundSongs = [];
    roundHistory = [];

    scoreElement.textContent = "Score: 0";
    pageArtist.textContent = "Choose Artist";

    modeScreen.classList.remove("hidden");
    artistScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");

    artistStartPanel.classList.add("hidden");
    selectAllArtistsButton.classList.add("hidden");

    resetArtistModeButtons();
    updateArtistSelectionUI();
}

homeButton.addEventListener("click", returnToHome);
modeButton.addEventListener("click", returnToHome);
closeHistoryButton.addEventListener("click", closeHistoryDetails);
historyModal.querySelector(".history-modal-backdrop").addEventListener("click", closeHistoryDetails);