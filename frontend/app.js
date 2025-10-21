// 🟣 app.js — Versión final con Socket.io y tu diseño

// Conexión al servidor backend (Render)
const socket = io("https://arbeauty-chatbot.onrender.com"); // <-- reemplaza con tu URL si es diferente

// Elementos del DOM
const messagesContainer = document.getElementById("messages");
const replyBox = document.getElementById("reply");
const sendBtn = document.getElementById("send-btn");

// 🟢 Confirmar conexión al servidor
socket.on("connect", () => {
  console.log("✅ Conectado al servidor en tiempo real");
  addSystemMessage("Conectado al servidor en tiempo real ✅");
});

// 📩 Escuchar mensajes entrantes desde WhatsApp
socket.on("nuevoMensaje", (msg) => {
  console.log("📩 Mensaje recibido:", msg);
  addMessage(msg.texto, "client", msg.nombre, msg.telefono, msg.fecha);
});

// 🧩 Función para agregar mensajes visuales al panel
function addMessage(text, sender = "client", name = "", phone = "", time = "") {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", sender);

  msgDiv.innerHTML = `
    <strong>${name || "Desconocido"}</strong> 
    <small>${phone || ""}</small><br>
    <span>${text}</span><br>
    <small style="color:#999;">${time || new Date().toLocaleString("es-HN")}</small>
  `;

  messagesContainer.appendChild(msgDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 🧠 Mensajes del sistema (como “conectado”, “esperando datos”)
function addSystemMessage(text) {
  const sysMsg = document.createElement("p");
  sysMsg.classList.add("system");
  sysMsg.textContent = text;
  messagesContainer.appendChild(sysMsg);
}

// ✉️ Enviar mensaje desde el panel (todavía no se manda a WhatsApp)
sendBtn.addEventListener("click", async () => {
  const text = replyBox.value.trim();
  if (!text) return alert("Escribe una respuesta antes de enviar.");

  // Mostrar mensaje localmente (bot)
  addMessage(text, "bot", "ARBEAUTY");

  // Limpiar campo
  replyBox.value = "";

  // (Próximo paso) Enviar mensaje al backend
  try {
    await fetch("https://arbeauty-chatbot.onrender.com/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensaje: text }),
    });
  } catch (error) {
    console.error("❌ Error al enviar mensaje:", error);
  }
});
