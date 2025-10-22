// 🟣 app.js — ARBEAUTY CRM Avanzado con pestañas por ciudad y persistencia total

const socket = io("https://arbeauty-chatbot.onrender.com");
const chatList = document.getElementById("chat-list");
const messagesContainer = document.getElementById("messages");
const replyInput = document.getElementById("reply");
const sendBtn = document.getElementById("send-btn");
const chatHeader = document.getElementById("chat-header");
const tabButtons = document.querySelectorAll(".tabs button");

// 🔹 Persistencia local de chats (localStorage)
let chats = JSON.parse(localStorage.getItem("arbeautyChats")) || {}; // Carga previa si existe

// 🧠 Asegurarse que todos los chats tengan su ciudad asignada
Object.keys(chats).forEach((tel) => {
  if (!chats[tel].ciudad) {
    chats[tel].ciudad = "Sin clasificar";
  }
});

let currentChat = null;
// 🔹 Restaurar pestaña activa guardada o default "San Pedro Sula"
let activeCity = localStorage.getItem("arbeautyActiveCity") || "San Pedro Sula";

// 📩 Recibir mensajes en tiempo real
socket.on("nuevoMensaje", (msg) => {
  const { telefono, nombre, texto, ciudad, fecha, de } = msg;

  if (!chats[telefono]) {
    chats[telefono] = { nombre, ciudad, mensajes: [] };
  } else if (ciudad) {
    chats[telefono].ciudad = ciudad;
  }

  chats[telefono].mensajes.push({ de, texto, fecha });

  // 💾 Guardar en localStorage
  localStorage.setItem("arbeautyChats", JSON.stringify(chats));

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

    // 💾 Guardar pestaña activa
    localStorage.setItem("arbeautyActiveCity", activeCity);

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

  // 💾 Guardar último chat abierto
  localStorage.setItem("arbeautyLastChat", telefono);

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
  localStorage.setItem("arbeautyChats", JSON.stringify(chats));

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

// 🪄 Restaurar pestaña activa, chats y último chat al recargar
window.addEventListener("load", () => {
  // Restaurar pestaña activa (guardada en localStorage)
  tabButtons.forEach((btn) => {
    if (btn.dataset.city === activeCity) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Restaurar chats desde localStorage
  if (Object.keys(chats).length > 0) {
    console.log("💾 Restaurando chats guardados:", chats);
    renderChatList();

    // 🔹 Si había un chat abierto, restaurarlo automáticamente
    const lastChat = localStorage.getItem("arbeautyLastChat");
    if (lastChat && chats[lastChat]) {
      openChat(lastChat);
    }
  } else {
    console.log("⚠️ No hay chats guardados localmente aún.");
  }
});

