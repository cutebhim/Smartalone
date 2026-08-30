import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const loginBox = document.getElementById("loginBox");
const uploadBox = document.getElementById("uploadBox");
const loginMsg = document.getElementById("loginMsg");
const status = document.getElementById("status");
const progressBar = document.getElementById("progressBar");
const progressPercent = document.getElementById("progressPercent");
const userEmail = document.getElementById("userEmail");
const uploadBtn = document.getElementById("uploadBtn");

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    loginMsg.textContent = "Email aur password bharo.";
    return;
  }

  loginMsg.textContent = "Login ho raha hai...";

  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginMsg.textContent = "";
  } catch (error) {
    console.error(error);
    loginMsg.textContent = "Login failed: " + error.message;
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, user => {
  if (user) {
    loginBox.hidden = true;
    uploadBox.hidden = false;
    userEmail.textContent = user.email || user.uid;
  } else {
    loginBox.hidden = false;
    uploadBox.hidden = true;
  }
});

document.getElementById("uploadBtn").addEventListener("click", async () => {
  const user = auth.currentUser;
  const file = document.getElementById("media").files[0];
  const title = document.getElementById("title").value.trim() || "New Frame";
  const tag = document.getElementById("tag").value.trim() || "#smartalone";

  if (!user) {
    status.textContent = "Pehle login karo.";
    return;
  }

  if (!file) {
    status.textContent = "Photo ya video select karo.";
    return;
  }

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  if (!isImage && !isVideo) {
    status.textContent = "Sirf image ya video allowed hai.";
    return;
  }

  const maxSize = isVideo ? 100 * 1024 * 1024 : 15 * 1024 * 1024;

  if (file.size > maxSize) {
    status.textContent = isVideo
      ? "Video 100 MB se chhota rakho."
      : "Photo 15 MB se chhota rakho.";
    return;
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `posts/${user.uid}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, filePath);

  progressBar.style.width = "0%";
  progressPercent.textContent = "0%";
  status.textContent = "Upload ho raha hai...";
  uploadBtn.disabled = true;

  try {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        uploadedBy: user.uid
      }
    });

    uploadTask.on(
      "state_changed",

      snapshot => {
        const percent =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

        const roundedPercent = Math.round(percent);

        progressBar.style.width = `${roundedPercent}%`;
        progressPercent.textContent = `${roundedPercent}%`;
        status.textContent = `Upload ho raha hai... ${roundedPercent}%`;
      },

      error => {
        console.error(error);
        status.textContent = "Upload failed: " + error.message;
        uploadBtn.disabled = false;
      },

      async () => {
        try {
          const mediaUrl = await getDownloadURL(uploadTask.snapshot.ref);

          await addDoc(collection(db, "posts"), {
            title,
            tag,
            mediaUrl,
            mediaType: isVideo ? "video" : "image",
            storagePath: filePath,
            createdAt: serverTimestamp(),
            createdBy: user.uid
          });

          progressBar.style.width = "100%";
          progressPercent.textContent = "100%";
          status.textContent = "✅ Post live ho gaya!";

          document.getElementById("media").value = "";
          document.getElementById("title").value = "";
          document.getElementById("tag").value = "";
        } catch (error) {
          console.error(error);
          status.textContent = "Publish failed: " + error.message;
        } finally {
          uploadBtn.disabled = false;
        }
      }
    );
  } catch (error) {
    console.error(error);
    status.textContent = "Error: " + error.message;
    uploadBtn.disabled = false;
  }
});
