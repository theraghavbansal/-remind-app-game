/* ==========================================================================
   R.E.M.I.N.D — Music Memory Quiz
   --------------------------------------------------------------------------
   Playback uses Spotify's official embeddable player (the "iFrame API"),
   so real songs play — no API key or login needed. Spotify serves a
   30-second preview to anonymous listeners; if the person is signed in
   to Spotify Premium in this same browser, the embed plays the full
   track. Every trackId below is a real, verified Spotify track.
   ========================================================================== */

const SONGS = [
  { id: "s1", title: "Lag Jaa Gale",              singer: "Lata Mangeshkar", trackId: "73kAlauQKp7H5jAid214uw" }, // Woh Kaun Thi, 1964
  { id: "s2", title: "Main Nikla Gaddi Leke",          singer: "Udit Narayan",   trackId: "6Awish0tgRWsZJ93gVsUKG" }, // Aradhana, 1969
  { id: "s3", title: "Chaudhvin Ka Chand Ho",      singer: "Mohammed Rafi",   trackId: "6JZL3hDpamxTMMYjGbfVHH" }, // Chaudhvin Ka Chand, 1960
  { id: "s4", title: "Main Koi Aisa Geet Gaoon",          singer: "Alka Yagnik",     trackId: "0WBClBemYPJR44H6uIn0kp" }, // Umrao Jaan, 1981
  { id: "s5", title: "Awaara Hoon",                singer: "Mukesh",          trackId: "1qdyP1IC8RyD5kvIbbViwv" }, // Awara, 1951
  { id: "s6", title: "Ek Ladki Bheegi Bhagi Si",           singer: "Kishore Kumar", trackId: "2wM51RIXhiuFbILoaPp72w" }, // Mahal, 1949
  { id: "s7", title: "Mera Naam Chin Chin Choo",   singer: "Geeta Dutt",      trackId: "3NX6PxKTxiqw7HO7b60RdX" }, // Howrah Bridge, 1958
  { id: "s8", title: "Dheere Dheere Se Meri Zindagi Mein Ana", singer: "Kumar Sanu",       trackId: "3xGwSN1dDdpN2s8oP8DRrC" }, // Anand, 1971
];

/* ---------------------------------------------------------------------- */
/* State                                                                   */
/* ---------------------------------------------------------------------- */
let quizOrder = [];
let currentIndex = 0;
let currentQuestionType = "guessSinger";
let hasAnswered = false;
let selectedValue = null;
let selectedBtn = null;
let spotifyController = null;   // set once the iFrame API is ready
let clipTimeoutId = null;       // cancels/replaces the auto-stop timer
let playRequestId = 0;          // invalidates stale "track started" listeners

const CLIP_SECONDS = 80;        // how much of each song to play

/* ---------------------------------------------------------------------- */
/* Spotify iFrame API setup                                                */
/* ---------------------------------------------------------------------- */
window.onSpotifyIframeApiReady = (IFrameAPI) => {
  const element = document.getElementById("spotify-embed");
  const options = {
    uri: `spotify:track:${SONGS[0].trackId}`,
    width: "1",
    height: "1",
  };
  IFrameAPI.createController(element, options, (controller) => {
    spotifyController = controller;
  });
};

/* Loads a track and waits for Spotify to actually report "playing"
   (via the playback_update event) before starting the clip timer —
   instead of guessing a fixed delay, which either cut songs off
   before they'd truly started or left them silent if loading took
   longer than the guess. Clicking a new option while one is still
   loading invalidates the older request so they never collide. */
function playTrack(trackId, onClipEnd){
  if(!spotifyController){
    setTimeout(() => playTrack(trackId, onClipEnd), 300);
    return;
  }

  if(clipTimeoutId) clearTimeout(clipTimeoutId);
  const requestId = ++playRequestId;

  const onUpdate = (e) => {
    if(requestId !== playRequestId) return; // superseded by a newer request
    if(e && e.data && e.data.isPaused === false){
      spotifyController.removeListener("playback_update", onUpdate);
      clipTimeoutId = setTimeout(() => {
        spotifyController.pause();
        if(onClipEnd) onClipEnd();
      }, CLIP_SECONDS * 1000);
    }
  };

  spotifyController.addListener("playback_update", onUpdate);
  spotifyController.loadUri(`spotify:track:${trackId}`);
  spotifyController.play();
}

/* ---------------------------------------------------------------------- */
/* Screen helpers                                                          */
/* ---------------------------------------------------------------------- */
const screens = {
  welcome:  document.getElementById("screen-welcome"),
  question: document.getElementById("screen-question"),
  end:      document.getElementById("screen-end"),
};

function showScreen(name){
  Object.values(screens).forEach(s => s.dataset.active = "false");
  screens[name].dataset.active = "true";
}

/* ---------------------------------------------------------------------- */
/* Utilities                                                                */
/* ---------------------------------------------------------------------- */
function shuffle(arr){
  const copy = [...arr];
  for(let i = copy.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickWrongOptions(pool, correctValue, key, count){
  const candidates = shuffle(pool.filter(item => item[key] !== correctValue));
  const seen = new Set([correctValue]);
  const picks = [];
  for(const c of candidates){
    if(picks.length >= count) break;
    if(seen.has(c[key])) continue;
    seen.add(c[key]);
    picks.push(c[key]);
  }
  return picks;
}

/* ---------------------------------------------------------------------- */
/* Quiz flow                                                                */
/* ---------------------------------------------------------------------- */
const els = {
  progress:    document.getElementById("progress-label"),
  kicker:      document.getElementById("prompt-kicker"),
  promptText:  document.getElementById("prompt-text"),
  btnPlay:     document.getElementById("btn-play"),
  playIcon:    document.getElementById("play-icon"),
  playLabel:   document.getElementById("play-label"),
  options:     document.getElementById("options"),
  feedback:    document.getElementById("feedback"),
  btnSubmit:   document.getElementById("btn-submit"),
  btnNext:     document.getElementById("btn-next"),
  record:      document.getElementById("record"),
  endSummary:  document.getElementById("end-summary"),
};

function startQuiz(){
  quizOrder = shuffle(SONGS);
  currentIndex = 0;
  showScreen("question");
  loadQuestion();
}

function loadQuestion(){
  hasAnswered = false;
  selectedValue = null;
  selectedBtn = null;
  if(clipTimeoutId) clearTimeout(clipTimeoutId);
  if(spotifyController) spotifyController.pause();
  els.record.dataset.spin = "false";
  els.feedback.textContent = "";
  els.btnSubmit.hidden = true;
  els.btnSubmit.disabled = true;
  els.btnNext.hidden = true;

  const song = quizOrder[currentIndex];
  currentQuestionType = currentIndex % 2 === 0 ? "guessSinger" : "guessSong";
  els.progress.textContent = `Song ${currentIndex + 1} of ${quizOrder.length}`;

  if(currentQuestionType === "guessSinger"){
    buildGuessSingerQuestion(song);
  } else {
    buildGuessSongQuestion(song);
  }
}

/* Type A: play the song, choose the singer */
function buildGuessSingerQuestion(song){
  els.kicker.textContent = "Listen, then choose the singer";
  els.promptText.textContent = "🎵 Tap play to listen 🎵";
  els.btnPlay.hidden = false;
  setPlayButton(false);

  els.btnPlay.onclick = () => {
    setPlayButton(true);
    els.record.dataset.spin = "true";
    playTrack(song.trackId, () => {
      setPlayButton(false);
      els.record.dataset.spin = "false";
    });
  };

  const wrongSingers = pickWrongOptions(SONGS, song.singer, "singer", 3);
  const optionValues = shuffle([song.singer, ...wrongSingers]);
  renderOptions(optionValues, (value, btn) => selectOption(value, btn));

  els.btnSubmit.onclick = () => {
    gradeAnswer(selectedValue === song.singer, song.singer);
  };
}

/* Type B: singer name is shown, choose the correct song;
   selecting an option previews that song right away. Submitting grades it. */
function buildGuessSongQuestion(song){
  els.kicker.textContent = "Which song is by this singer?";
  els.promptText.textContent = song.singer;
  els.btnPlay.hidden = true;

  const wrongTitles = pickWrongOptions(SONGS, song.title, "title", 3);
  const optionValues = shuffle([song.title, ...wrongTitles]);

  renderOptions(optionValues, (value, btn) => {
    selectOption(value, btn);
    const chosenSong = SONGS.find(s => s.title === value);
    els.record.dataset.spin = "true";
    playTrack(chosenSong.trackId, () => {
      els.record.dataset.spin = "false";
    });
  });

  els.btnSubmit.onclick = () => {
    gradeAnswer(selectedValue === song.title, song.title);
  };
}

function setPlayButton(isPlaying){
  els.btnPlay.dataset.playing = isPlaying ? "true" : "false";
  els.playIcon.textContent = isPlaying ? "♪" : "▶";
  els.playIcon.classList.toggle("pulsing", isPlaying);
  els.playLabel.textContent = isPlaying ? "Playing…" : "Play Song";
}

function renderOptions(values, onSelect){
  els.options.innerHTML = "";
  values.forEach(value => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.type = "button";
    btn.textContent = value;
    btn.addEventListener("click", () => {
      if(hasAnswered) return;
      onSelect(value, btn);
    });
    els.options.appendChild(btn);
  });
}

/* Selecting an option just highlights it and arms the Submit button —
   it does NOT grade the answer yet. */
function selectOption(value, btn){
  selectedValue = value;
  selectedBtn = btn;

  [...els.options.children].forEach(b => {
    b.dataset.state = (b === btn) ? "selected" : "";
  });

  els.btnSubmit.hidden = false;
  els.btnSubmit.disabled = false;
}

function gradeAnswer(isCorrect, correctValue){
  if(hasAnswered || selectedValue === null) return;
  hasAnswered = true;

  [...els.options.children].forEach(btn => {
    if(btn.textContent === correctValue){
      btn.dataset.state = "correct";
    } else if(btn === selectedBtn){
      btn.dataset.state = "incorrect";
    } else {
      btn.dataset.state = "dim";
    }
    btn.disabled = true;
  });

  if(isCorrect){
    els.feedback.dataset.tone = "";
    els.feedback.textContent = "Wonderful! That's right. 🌟";
  } else {
    els.feedback.dataset.tone = "gentle";
    els.feedback.textContent = `That's alright — it was "${correctValue}." Lovely tune, isn't it?`;
  }

  els.btnSubmit.hidden = true;
  els.btnNext.hidden = false;
  els.btnNext.focus();
}

function nextQuestion(){
  currentIndex++;
  if(currentIndex >= quizOrder.length){
    finishQuiz();
  } else {
    loadQuestion();
  }
}

function finishQuiz(){
  if(clipTimeoutId) clearTimeout(clipTimeoutId);
  if(spotifyController) spotifyController.pause();
  els.record.dataset.spin = "false";
  els.endSummary.textContent = `You enjoyed ${quizOrder.length} songs together.`;
  showScreen("end");
}

/* ---------------------------------------------------------------------- */
/* Wire up buttons                                                         */
/* ---------------------------------------------------------------------- */
document.getElementById("btn-start").addEventListener("click", startQuiz);
document.getElementById("btn-next").addEventListener("click", nextQuestion);
document.getElementById("btn-restart").addEventListener("click", startQuiz);