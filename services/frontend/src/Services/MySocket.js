import { io } from "socket.io-client";

const socket = io.connect(process.env.REACT_APP_BACKEND_BASE_URL);

socket.on("connect", () => {
  // console.log("Connected to the server");
});

export default socket;
