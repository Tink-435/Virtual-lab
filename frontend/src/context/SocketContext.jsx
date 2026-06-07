import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("vlab_token");

    if (!token || !user) return;

    const newSocket = io("http://localhost:5001", {
      auth: {
        token,
      },
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
    });

    newSocket.on("connect_error", (err) => {
      console.error("❌ Socket connection error:", err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const joinRoom = (roomCode, userName) => {
    if (!socket) return;

    socket.emit("join_room", {
      roomCode,
      userName,
    });
  };

  const value = useMemo(
    () => ({
      socket,
      joinRoom,
    }),
    [socket]
  );

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }

  return context;
};