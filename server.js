const express = require('express');
const http = require('http');
const cors = require('cors');
const mqtt = require('mqtt');
const { Server } = require('socket.io');

// ✅ MQTT Public Broker (no auth)
const mqttUrl = 'mqtt://broker.hivemq.com:1883';
const tempTopic = 'esp32/temperature';
const humidityTopic = 'esp32/humidity';

// ✅ Express App + HTTP Server
const app = express();
app.use(cors());
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

// ✅ WebSocket Server via Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*', // 🔒 Replace with Firebase hosting URL in production
    methods: ['GET', 'POST']
  }
});

// ✅ Connect to HiveMQ (no username/password needed)
const mqttClient = mqtt.connect(mqttUrl, {
  clientId: `mqtt-web-client-${Math.random().toString(16).substr(2, 8)}`
});

mqttClient.on('connect', () => {
  console.log('✅ Connected to HiveMQ public broker');

  mqttClient.subscribe([tempTopic, humidityTopic], (err) => {
    if (err) {
      console.error('❌ Subscribe error:', err);
    } else {
      console.log(`📡 Subscribed to: ${tempTopic}, ${humidityTopic}`);
    }
  });
});

mqttClient.on('message', (topic, message) => {
  const value = message.toString();
  const payload = { topic, value };

  console.log(`📨 MQTT: ${topic} = ${value}`);
  io.emit('mqttData', payload); // Broadcast to frontend clients
});

mqttClient.on('error', (err) => console.error('❌ MQTT error:', err));
mqttClient.on('offline', () => console.log('📴 MQTT client offline'));
mqttClient.on('reconnect', () => console.log('🔄 Reconnecting to MQTT...'));

// ✅ WebSocket client connection
io.on('connection', (socket) => {
  console.log('🟢 React frontend connected via WebSocket');
  socket.on('disconnect', () => console.log('🔴 Client disconnected'));
});

// ✅ Start server
server.listen(PORT, () => {
  console.log(`🚀 WebSocket-MQTT Bridge running on port ${PORT}`);
});
