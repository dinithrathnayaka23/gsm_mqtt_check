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
    origin: '*', // ✅ Replace with your Firebase URL for production
    methods: ['GET', 'POST']
  }
});

// ✅ Connect to MQTT broker
const mqttClient = mqtt.connect(mqttUrl, {
  clientId: `mqtt-web-${Math.random().toString(16).slice(2, 10)}`
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

// ✅ MQTT incoming messages → emit to frontend via WebSocket
mqttClient.on('message', (topic, message) => {
  const value = message.toString();
  const payload = { topic, value };

  console.log(`📨 MQTT: ${topic} = ${value}`);
  console.log('📤 Emitting mqttData to clients:', payload);

  io.emit('mqttData', payload); // 🔥 Main bridge line
});

// ✅ Debug MQTT lifecycle
mqttClient.on('error', (err) => console.error('❌ MQTT error:', err));
mqttClient.on('offline', () => console.log('📴 MQTT offline'));
mqttClient.on('reconnect', () => console.log('🔄 MQTT reconnecting'));

// ✅ Socket.IO client connection
io.on('connection', (socket) => {
  console.log('🟢 WebSocket client connected:', socket.id);

  // ✅ TEMP TEST: emit fake temperature after connect
  setTimeout(() => {
    const fakePayload = {
      topic: 'esp32/temperature',
      value: '26.3'
    };
    console.log('🧪 Sending fake MQTT data to client:', fakePayload);
    socket.emit('mqttData', fakePayload);
  }, 2000);

  socket.on('disconnect', () => {
    console.log('🔴 WebSocket client disconnected:', socket.id);
  });
});

// ✅ Start backend server
server.listen(PORT, () => {
  console.log(`🚀 MQTT-WebSocket bridge running on port ${PORT}`);
});
