import Express from 'express';
import { Server, Socket } from 'socket.io';
import http from 'http';
// import useCoveyAppState from '../../../frontend/src/hooks/useCoveyAppState';

const app = Express();
// app.use(CORS()); // TODO: necessary?
// const server = useCoveyAppState()
const server = http.createServer(app);
const io = new Server(server);

function onConnection(socket: Socket){
  socket.on('drawing', (data) => socket.broadcast.emit('drawing', data));
}

io.on('connection', onConnection);

const port = 8080;
server.listen(port, () => console.log(`server is running on port ${port}`) );

/*

server.listen(process.env.port || 3000, () => {
  console.log(`App running on port ${process.env.port || 3000}`);
});

*/