import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
getStorage(app);
getAuth(app);

const gallery = document.getElementById("firebaseGallery");

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[ch]));
}

function createCard(post) {
  const card = document.createElement("div");
  card.className = "gallery-card";

  const title = escapeHTML(post.title || "New Frame");
  const tag = escapeHTML(post.tag || "#smartalone");
  const type = post.mediaType === "video" ? "Video" : "Photo";
  const date = post.createdAt?.toDate
    ? post.createdAt.toDate().toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })
    : "2026";

  const media = post.mediaType === "video"
    ? `<video src="${post.mediaUrl}" controls playsinline preload="metadata"></video>`
    : `<img src="${post.mediaUrl}" alt="${title}" loading="lazy">`;

  card.innerHTML = `
    ${media}
    <div class="card-overlay">
      <h3>${title}</h3>
      <div class="card-meta">${type} · ${date}</div>
      <span class="card-tag">${tag}</span>
    </div>
  `;

  return card;
}

// Real-time Firestore listener.
// When a new post is added from admin.html, the public page updates automatically.
const postsQuery = query(
  collection(db, "posts"),
  orderBy("createdAt", "desc")
);

onSnapshot(postsQuery, snapshot => {
  gallery.replaceChildren();
  snapshot.forEach(doc => {
    gallery.appendChild(createCard(doc.data()));
  });
}, error => {
  console.error("Firebase posts error:", error);
});
