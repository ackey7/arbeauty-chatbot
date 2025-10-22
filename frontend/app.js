// 🟣 app.js — versión mejorada ARBEAUTY 2025

const socket = io("https://arbeauty-chatbot.onrender.com"); // 🔹 Asegura conexión directa con Render
const messagesContainer = document.getElementById("messages");
const replyInput = document.getElementById("reply");
const sendBtn = document.getElementById("send-btn");

let ultimoTelefono = null;

// 📩 Recibir mensajes en tiempo real
socket.on("nuevoMensaje", (msg) => {
  if (msg.telefono) ultimoTelefono = msg.telefono;
  mostrarMensaje(msg);
});

// 🧾 Mostrar mensajes en el panel
function mostrarMensaje({ de, nombre, texto, fecha }) {
  const msg = document.createElement("div");
  msg.classList.add("message", de === "bot" ? "bot" : "cliente");
  msg.innerHTML = `<strong>${nombre}</strong><br>${texto}<br><small>${fecha}</small>`;
  messagesContainer.appendChild(msg);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 📤 Enviar mensaje al cliente desde el panel
sendBtn.addEventListener("click", async () => {
  const mensaje = replyInput.value.trim();
  if (!mensaje) return;

  // Mostrar en el panel instantáneamente
  mostrarMensaje({
    de: "bot",
    nombre: "ARBEAUTY",
    texto: mensaje,
    fecha: new Date().toLocaleString("es-HN"),
  });

  replyInput.value = "";

  try {
    const response = await fetch("https://arbeauty-chatbot.onrender.com/webhooks/meta/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mensaje,
        telefono: ultimoTelefono, // 🔹 Se asegura que se use el último número activo
      }),
    });

    if (!response.ok) {
      console.error("❌ Error enviando mensaje al servidor");
    } else {
      console.log("📤 Mensaje enviado correctamente al cliente");
    }
  } catch (error) {
    console.error("❌ Error en la solicitud:", error);
  }
});
