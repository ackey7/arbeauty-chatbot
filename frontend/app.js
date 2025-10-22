// 🟣 app.js — ARBEAUTY CRM Avanzado con pestañas por ciudad

const socket = io("https://arbeauty-chatbot.onrender.com");
const chatList = document.getElementById("chat-list");
const messagesContainer = document.getElementById("messages");
const replyInput = document.getElementById("reply");
const sendBtn = document.getElementById("send-btn");
const chatHeader = document.getElementById("chat-header");
const tabButtons = document.querySelectorAll(".tabs button");

let chats = {}; // { telefono: { nombre, ciudad, mensajes: [] } }
let currentChat = null;
let activeCity = "San Pedro Sula";

// 📩 Recibir mensajes en tiempo real
socket.on("nuevoMensaje", (msg) => {
  const { telefono, nombre, texto, ciudad, fecha, de } = msg;

  if (!chats[telefono]) {
    chats[telefono] = { nombre, ciudad, mensajes: [] };
  } else if (ciudad) {
    chats[telefono].ciudad = ciudad;
  }

  chats[telefono].mensajes.push({ de, texto, fecha });

  renderChatList();
  if (currentChat === telefono) renderMessages(telefono);
});

// 📋 Renderizar lista de chats
function renderChatList() {
  chatList.innerHTML = "";

  const filtered = Object.entries(chats).filter(
    ([, c]) => c.ciudad === activeCity
  );

  for (const [telefono, chat] of filtered) {
    const lastMsg = chat.mensajes[chat.mensajes.length - 1];
    const item = document.createElement("div");
    item.classList.add("chat-item");
    item.innerHTML = `
      <div class="name">${chat.nombre}</div>
      <div class="preview">${lastMsg?.texto || "..."}</div>
      <div class="city">${chat.ciudad}</div>
    `;
    item.addEventListener("click", () => openChat(telefono));
    chatList.appendChild(item);
  }
}

// 🗂️ Cambiar pestaña
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeCity = btn.dataset.city;
    renderChatList();
  });
});

// 💬 Abrir chat
function openChat(telefono) {
  currentChat = telefono;
  const chat = chats[telefono];
  chatHeader.innerHTML = `<h2>${chat.nombre} · <small>${chat.ciudad}</small></h2>`;
  replyInput.disabled = false;
  sendBtn.disabled = false;
  renderMessages(telefono);
}

// 📨 Renderizar mensajes
function renderMessages(telefono) {
  const chat = chats[telefono];
  messagesContainer.innerHTML = "";
  chat.mensajes.forEach((m) => {
    const div = document.createElement("div");
    div.classList.add("message", m.de === "bot" ? "bot" : "cliente");
    div.innerText = m.texto;
    messagesContainer.appendChild(div);
  });
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 📤 Enviar mensaje
sendBtn.addEventListener("click", async () => {
  const mensaje = replyInput.value.trim();
  if (!mensaje || !currentChat) return;

  // Mostrar localmente
  chats[currentChat].mensajes.push({
    de: "bot",
    texto: mensaje,
    fecha: new Date().toLocaleString("es-HN"),
  });
  renderMessages(currentChat);

  replyInput.value = "";

  try {
    await fetch("https://arbeauty-chatbot.onrender.com/webhooks/meta/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mensaje,
        telefono: currentChat,
      }),
    });
  } catch (err) {
    console.error("Error enviando:", err);
  }
});
