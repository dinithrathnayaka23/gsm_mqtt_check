const express = require('express');
const http = require('http');
const cors = require('cors');
const mqtt = require('mqtt');
const { Server } = require('socket.io');

// ✅ MQTT Public Broker (HiveMQ)
const mqttUrl = 'mqtt://broker.hivemq.com:1883';
const tempTopic = 'esp32/temperature';
const humidityTopic = 'esp32/humidity';

// ✅ Express + HTTP Server
const app = express();
app.use(cors());
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

// ✅ WebSocket Server via Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*', // 🔒 Replace with Firebase frontend URL for production
    methods: ['GET', 'POST'],
  }
});

// ✅ Connect to MQTT broker
const mqttClient = mqtt.connect(mqttUrl, {
  clientId: `mqtt-web-${Math.random().toString(16).slice(2, 10)}`,
});

mqttClient.on('connect', () => {
  console.log('✅ Connected to HiveMQ public broker');

  mqttClient.subscribe([tempTopic, humidityTopic], (err) => {
    if (err) {
      console.error('❌ Error subscribing to topics:', err);
    } else {
      console.log(`📡 Subscribed to topics: [${tempTopic}, ${humidityTopic}]`);
    }
  });
});

// ✅ MQTT → WebSocket Bridge
mqttClient.on('message', (topic, message) => {
  const value = message.toString().trim(); // Trim whitespace
  const payload = { topic, value };

  console.log(`📨 MQTT Message Received → ${topic}: ${value}`);
  console.log('📤 Broadcasting to clients → mqttData:', payload);

  io.emit('mqttData', payload); // 🔥 Main WebSocket emit
});

// ✅ Handle MQTT lifecycle events
mqttClient.on('error', err => console.error('❌ MQTT error:', err));
mqttClient.on('offline', () => console.log('📴 MQTT client offline'));
mqttClient.on('reconnect', () => console.log('🔄 Reconnecting to MQTT broker'));

// ✅ WebSocket Client Events
io.on('connection', (socket) => {
  console.log(`🟢 WebSocket client connected: ${socket.id}`);

  // ✅ Optional: send a test value for debug
  setTimeout(() => {
    const testPayload = {
      topic: 'esp32/temperature',
      value: '26.3'
    };
    console.log('🧪 Sending test MQTT data to frontend:', testPayload);
    socket.emit('mqttData', testPayload);
  }, 2000);

  socket.on('disconnect', () => {
    console.log(`🔴 WebSocket client disconnected: ${socket.id}`);
  });
});

// ✅ Start server
server.listen(PORT, () => {
  console.log(`🚀 MQTT-WebSocket bridge running at http://localhost:${PORT}`);
});
