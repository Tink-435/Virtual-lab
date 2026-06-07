const [roomData, setRoomData] = useState(null);

// Step 1: load room from REST
useEffect(() => {
  const loadRoom = async () => {
    try {
      const res = await api.get(`/rooms/${roomCode}`);
      setRoomData(res.data.room);
    } catch (err) {
      setError(err.response?.data?.error || 'Room not found');
    } finally {
      setLoading(false);
    }
  };
  loadRoom();
}, [roomCode]);

// Step 2: join socket room once BOTH room data AND socket are ready
useEffect(() => {
  if (roomData && socket && user) {
    console.log('🚪 Joining room via socket:', roomCode);
    joinRoom(roomCode, user.name);
    setRoom(roomData);
  }
}, [roomData, socket, user]); // fires when socket finally becomes non-null