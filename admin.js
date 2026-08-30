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

import { firebaseConfig } from "./firebase-config.js";
import { cloudinaryConfig } from "./cloudinary-config.js";


// ===============================
// Firebase
// ===============================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


// ===============================
// Elements
// ===============================

const loginBox = document.getElementById("loginBox");
const uploadBox = document.getElementById("uploadBox");

const loginMsg = document.getElementById("loginMsg");
const status = document.getElementById("status");

const progressBar =
  document.getElementById("progressBar");

const progressPercent =
  document.getElementById("progressPercent");

const userEmail =
  document.getElementById("userEmail");

const uploadBtn =
  document.getElementById("uploadBtn");


// ===============================
// LOGIN
// ===============================

document
  .getElementById("loginBtn")
  .addEventListener("click", async () => {

    const email =
      document.getElementById("email")
        .value
        .trim();

    const password =
      document.getElementById("password")
        .value;

    if (!email || !password) {

      loginMsg.textContent =
        "Email aur password bharo.";

      return;
    }

    loginMsg.textContent =
      "Login ho raha hai...";

    try {

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      loginMsg.textContent = "";

    } catch (error) {

      console.error(error);

      loginMsg.textContent =
        "Login failed: " +
        error.message;
    }

  });


// ===============================
// LOGOUT
// ===============================

document
  .getElementById("logoutBtn")
  .addEventListener("click", () => {

    signOut(auth);

  });


// ===============================
// AUTH STATE
// ===============================

onAuthStateChanged(auth, user => {

  if (user) {

    loginBox.hidden = true;

    uploadBox.hidden = false;

    userEmail.textContent =
      user.email || user.uid;

  } else {

    loginBox.hidden = false;

    uploadBox.hidden = true;

  }

});


// ===============================
// UPLOAD
// ===============================

uploadBtn.addEventListener(
  "click",
  async () => {

    const user = auth.currentUser;

    const fileInput =
      document.getElementById("media");

    const file =
      fileInput.files[0];

    const title =
      document.getElementById("title")
        .value
        .trim() || "New Frame";

    const tag =
      document.getElementById("tag")
        .value
        .trim() || "#smartalone";


    // ---------------------------
    // LOGIN CHECK
    // ---------------------------

    if (!user) {

      status.textContent =
        "Pehle login karo.";

      return;
    }


    // ---------------------------
    // FILE CHECK
    // ---------------------------

    if (!file) {

      status.textContent =
        "Photo ya video select karo.";

      return;
    }


    const isImage =
      file.type.startsWith("image/");

    const isVideo =
      file.type.startsWith("video/");


    if (!isImage && !isVideo) {

      status.textContent =
        "Sirf image ya video allowed hai.";

      return;
    }


    // ---------------------------
    // SIZE LIMIT
    // ---------------------------

    const maxSize =
      isVideo
        ? 100 * 1024 * 1024
        : 15 * 1024 * 1024;


    if (file.size > maxSize) {

      status.textContent =
        isVideo
          ? "Video 100 MB se chhota rakho."
          : "Photo 15 MB se chhota rakho.";

      return;
    }


    // ---------------------------
    // RESET PROGRESS
    // ---------------------------

    progressBar.style.width = "0%";

    progressPercent.textContent = "0%";

    status.textContent =
      "Cloudinary upload shuru ho raha hai...";


    uploadBtn.disabled = true;


    try {

      // ==================================
      // CLOUDINARY URL
      // ==================================

      const cloudinaryUrl =
        `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/auto/upload`;


      // ==================================
      // FORM DATA
      // ==================================

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      formData.append(
        "upload_preset",
        cloudinaryConfig.uploadPreset
      );


      // ==================================
      // XMLHttpRequest
      // LIVE PROGRESS
      // ==================================

      const result =
        await new Promise(
          (resolve, reject) => {

            const xhr =
              new XMLHttpRequest();


            xhr.open(
              "POST",
              cloudinaryUrl
            );


            // ----------------------------
            // PROGRESS
            // ----------------------------

            xhr.upload.onprogress =
              event => {

                if (!event.lengthComputable) {
                  return;
                }

                const percent =
                  Math.round(
                    (event.loaded /
                      event.total) * 100
                  );


                progressBar.style.width =
                  `${percent}%`;


                progressPercent.textContent =
                  `${percent}%`;


                status.textContent =
                  `Upload ho raha hai... ${percent}%`;

              };


            // ----------------------------
            // SUCCESS / ERROR
            // ----------------------------

            xhr.onload = () => {

              if (
                xhr.status >= 200 &&
                xhr.status < 300
              ) {

                try {

                  const data =
                    JSON.parse(xhr.responseText);

                  resolve(data);

                } catch (error) {

                  reject(
                    new Error(
                      "Cloudinary response samajh nahi aaya."
                    )
                  );

                }

              } else {

                let message =
                  "Cloudinary upload failed.";

                try {

                  const data =
                    JSON.parse(
                      xhr.responseText
                    );

                  if (
                    data.error &&
                    data.error.message
                  ) {

                    message =
                      data.error.message;

                  }

                } catch (e) {
                  // Ignore JSON parse error
                }

                reject(
                  new Error(message)
                );

              }

            };


            xhr.onerror = () => {

              reject(
                new Error(
                  "Network error. Internet connection check karo."
                )
              );

            };


            xhr.onabort = () => {

              reject(
                new Error(
                  "Upload cancel ho gaya."
                )
              );

            };


            xhr.send(formData);

          }
        );


      // ==================================
      // CLOUDINARY URL
      // ==================================

      const mediaUrl =
        result.secure_url;


      // ==================================
      // FIRESTORE SAVE
      // ==================================

      await addDoc(
        collection(db, "posts"),
        {

          title: title,

          tag: tag,

          mediaUrl: mediaUrl,

          mediaType:
            isVideo
              ? "video"
              : "image",

          cloudinaryPublicId:
            result.public_id,

          createdAt:
            serverTimestamp(),

          createdBy:
            user.uid

        }
      );


      // ==================================
      // COMPLETE
      // ==================================

      progressBar.style.width =
        "100%";

      progressPercent.textContent =
        "100%";

      status.textContent =
        "✅ Upload complete! Post live ho gaya.";


      // Clear fields

      fileInput.value = "";

      document.getElementById(
        "title"
      ).value = "";

      document.getElementById(
        "tag"
      ).value = "";


    } catch (error) {

      console.error(error);

      status.textContent =
        "❌ Upload failed: " +
        error.message;

    } finally {

      uploadBtn.disabled = false;

    }

  }
);
