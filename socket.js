import { io } from 'socket.io-client';

const socket = io('https://mqtt-check1.onrender.com'); // your deployed backend URL

export default socket;
