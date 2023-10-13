import { io } from "https://cdn.socket.io/4.3.2/socket.io.esm.min.js";
// Get username
const getUsername = async () => {
  const username = localStorage.getItem("username");
  if (username) return username;

  const res = await fetch("https://random-data-api.com/api/users/random_user");
  const { username: randomUsername } = await res.json();
  localStorage.setItem("username", randomUsername);
  return randomUsername;
};

document.addEventListener("DOMContentLoaded", async () => {
  const socket = io({
    auth: {
      // Send username to server
      username: await getUsername(),
      // Always send this auth data to server
      serverOffeset: 0,
    },
  });

  // Elements of DOM
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const messages = document.getElementById("messages");

  // Receive message from server
  socket.on("chat message", async (msg, serverOffeset, username) => {
    const isOwn = username === (await getUsername());
    const item = `
    <li class="${isOwn ? "own" : "foreign"}">
      <p>${msg}<p>
      <small>${username}</small>
    </li>`;
    messages?.insertAdjacentHTML("beforeend", item);
    socket.auth.serverOffeset = serverOffeset;

    // Scroll to bottom of messages
    messages.scrollTop = messages.scrollHeight;
  });

  // Send message to server
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const message = input?.value;
    if (!message || message === "") return;

    socket.emit("chat message", message);
    input.value = "";
  });
});
