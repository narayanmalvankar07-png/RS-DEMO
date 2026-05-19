// src/services/websocket.js

let socket = null;
let currentUserId = null;
const listeners = new Set();

export const connectWebSocket = (userId) => {
  if (!userId) return;
  currentUserId = userId;

  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  console.log("[WS] Connecting to", wsUrl);
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log("[WS] Connected successfully");
    // Authenticate the connection with the user ID
    socket.send(JSON.stringify({ type: "auth", userId }));
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      // Notify all registered listeners of the new message event
      listeners.forEach((listener) => listener(data));
    } catch (err) {
      console.error("[WS] Error parsing incoming message:", err);
    }
  };

  socket.onclose = () => {
    console.log("[WS] Disconnected, attempting reconnect in 3 seconds...");
    setTimeout(() => connectWebSocket(currentUserId), 3000);
  };

  socket.onerror = (err) => {
    console.error("[WS] Socket error:", err);
  };
};

export const disconnectWebSocket = () => {
  if (socket) {
    socket.close();
    socket = null;
  }
};

// Send a payload to the WebSocket server
export const sendWSMessage = (payload) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  } else {
    console.warn("[WS] Cannot send message, socket not open:", payload);
  }
};

// Subscribe to incoming WebSocket events
export const subscribeWS = (callback) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};
