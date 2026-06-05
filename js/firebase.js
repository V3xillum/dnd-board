import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDAqOQu0o94raZqDNHQfzq_leJl1XEAyIg",
  authDomain: "v3x-board.firebaseapp.com",
  databaseURL: "https://v3x-board-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "v3x-board",
  storageBucket: "v3x-board.firebasestorage.app",
  messagingSenderId: "182793883396",
  appId: "1:182793883396:web:ee8a466730d82424764a51",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function gameRef(gameId, path) {
  return ref(db, `games/${gameId}/${path}`);
}

window.writeGameState = (gameId, state) => set(gameRef(gameId, "state"), state);

window.onGameState = (gameId, callback) => onValue(gameRef(gameId, "state"), (snap) => {
  callback(snap.val());
});

window.writeActiveModal = (gameId, modal) => set(gameRef(gameId, "activeModal"), modal);

window.onActiveModal = (gameId, callback) => onValue(gameRef(gameId, "activeModal"), (snap) => {
  callback(snap.val());
});

window.writeLastEvent = (gameId, entry) => set(gameRef(gameId, "lastEvent"), entry);

window.onLastEvent = (gameId, callback) => onValue(gameRef(gameId, "lastEvent"), (snap) => {
  callback(snap.val());
});

window.claimHostIfEmpty = async (gameId, sessionId) => {
  const metaRef = gameRef(gameId, "meta");
  const snap = await get(metaRef);
  const existing = snap.val()?.hostSessionId;
  if (!existing) {
    await set(metaRef, { hostSessionId: sessionId, phase: "playing" });
    return true;
  }
  return existing === sessionId;
};

window.onGameMeta = (gameId, callback) => onValue(gameRef(gameId, "meta"), (snap) => {
  callback(snap.val());
});

window.dispatchEvent(new Event("firebase-ready"));
