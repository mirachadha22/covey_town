import assert from 'assert';
import { Socket } from 'socket.io';
import {
  ConversationAreaCreateRequest,
  ServerConversationArea,
} from '../client/TownsServiceClient';
import { ChatMessage, CoveyTownList, LineData, UserLocation } from '../CoveyTypes';
import CoveyTownsStore from '../lib/CoveyTownsStore';
import CoveyTownListener from '../types/CoveyTownListener';
import Player from '../types/Player';

/**
 * The format of a request to join a Town in Covey.Town, as dispatched by the server middleware
 */
export interface TownJoinRequest {
  /** userName of the player that would like to join * */
  userName: string;
  /** ID of the town that the player would like to join * */
  coveyTownID: string;
}

/**
 * The format of a response to join a Town in Covey.Town, as returned by the handler to the server
 * middleware
 */
export interface TownJoinResponse {
  /** Unique ID that represents this player * */
  coveyUserID: string;
  /** Secret token that this player should use to authenticate
   * in future requests to this service * */
  coveySessionToken: string;
  /** Secret token that this player should use to authenticate
   * in future requests to the video service * */
  providerVideoToken: string;
  /** List of players currently in this town * */
  currentPlayers: Player[];
  /** Friendly name of this town * */
  friendlyName: string;
  /** Is this a private town? * */
  isPubliclyListed: boolean;
  /** Conversation areas currently active in this town */
  conversationAreas: ServerConversationArea[];
}

/**
 * Payload sent by client to create a Town in Covey.Town
 */
export interface TownCreateRequest {
  friendlyName: string;
  isPubliclyListed: boolean;
}

/**
 * Response from the server for a Town create request
 */
export interface TownCreateResponse {
  coveyTownID: string;
  coveyTownPassword: string;
}

/**
 * Response from the server for a Town list request
 */
export interface TownListResponse {
  towns: CoveyTownList;
}

/**
 * Payload sent by the client to delete a Town
 */
export interface TownDeleteRequest {
  coveyTownID: string;
  coveyTownPassword: string;
}

/**
 * Payload sent by the client to update a Town.
 * N.B., JavaScript is terrible, so:
 * if(!isPubliclyListed) -> evaluates to true if the value is false OR undefined, use ===
 */
export interface TownUpdateRequest {
  coveyTownID: string;
  coveyTownPassword: string;
  friendlyName?: string;
  isPubliclyListed?: boolean;
}

/**
 * Envelope that wraps any response from the server
 */
export interface ResponseEnvelope<T> {
  isOK: boolean;
  message?: string;
  response?: T;
}

/**
 * A handler to process a player's request to join a town. The flow is:
 *  1. Client makes a TownJoinRequest, this handler is executed
 *  2. Client uses the sessionToken returned by this handler to make a subscription to the town,
 *  @see townSubscriptionHandler for the code that handles that request.
 *
 * @param requestData an object representing the player's request
 */
export async function townJoinHandler(
  requestData: TownJoinRequest,
): Promise<ResponseEnvelope<TownJoinResponse>> {
  const townsStore = CoveyTownsStore.getInstance();

  const coveyTownController = townsStore.getControllerForTown(requestData.coveyTownID);
  if (!coveyTownController) {
    return {
      isOK: false,
      message: 'Error: No such town',
    };
  }
  const newPlayer = new Player(requestData.userName);
  const newSession = await coveyTownController.addPlayer(newPlayer);
  assert(newSession.videoToken);
  return {
    isOK: true,
    response: {
      coveyUserID: newPlayer.id,
      coveySessionToken: newSession.sessionToken,
      providerVideoToken: newSession.videoToken,
      currentPlayers: coveyTownController.players,
      friendlyName: coveyTownController.friendlyName,
      isPubliclyListed: coveyTownController.isPubliclyListed,
      conversationAreas: coveyTownController.conversationAreas,
    },
  };
}

export function townListHandler(): ResponseEnvelope<TownListResponse> {
  const townsStore = CoveyTownsStore.getInstance();
  return {
    isOK: true,
    response: { towns: townsStore.getTowns() },
  };
}

export function townCreateHandler(
  requestData: TownCreateRequest,
): ResponseEnvelope<TownCreateResponse> {
  const townsStore = CoveyTownsStore.getInstance();
  if (requestData.friendlyName.length === 0) {
    return {
      isOK: false,
      message: 'FriendlyName must be specified',
    };
  }
  const newTown = townsStore.createTown(requestData.friendlyName, requestData.isPubliclyListed);
  return {
    isOK: true,
    response: {
      coveyTownID: newTown.coveyTownID,
      coveyTownPassword: newTown.townUpdatePassword,
    },
  };
}

export function townDeleteHandler(
  requestData: TownDeleteRequest,
): ResponseEnvelope<Record<string, null>> {
  const townsStore = CoveyTownsStore.getInstance();
  const success = townsStore.deleteTown(requestData.coveyTownID, requestData.coveyTownPassword);
  return {
    isOK: success,
    response: {},
    message: !success
      ? 'Invalid password. Please double check your town update password.'
      : undefined,
  };
}

export function townUpdateHandler(
  requestData: TownUpdateRequest,
): ResponseEnvelope<Record<string, null>> {
  const townsStore = CoveyTownsStore.getInstance();
  const success = townsStore.updateTown(
    requestData.coveyTownID,
    requestData.coveyTownPassword,
    requestData.friendlyName,
    requestData.isPubliclyListed,
  );
  return {
    isOK: success,
    response: {},
    message: !success
      ? 'Invalid password or update values specified. Please double check your town update password.'
      : undefined,
  };
}

/**
 * A handler to process the "Create Conversation Area" request
 * The intended flow of this handler is:
 * * Fetch the town controller for the specified town ID
 * * Validate that the sessionToken is valid for that town
 * * Ask the TownController to create the conversation area
 * @param _requestData Conversation area create request
 */
export function conversationAreaCreateHandler(
  _requestData: ConversationAreaCreateRequest,
): ResponseEnvelope<Record<string, null>> {
  const townsStore = CoveyTownsStore.getInstance();
  const townController = townsStore.getControllerForTown(_requestData.coveyTownID);
  if (!townController?.getSessionByToken(_requestData.sessionToken)) {
    return {
      isOK: false,
      response: {},
      message: `Unable to create conversation area ${_requestData.conversationArea.label} with topic ${_requestData.conversationArea.topic}`,
    };
  }
  const success = townController.addConversationArea(_requestData.conversationArea);

  return {
    isOK: success,
    response: {},
    message: !success
      ? `Unable to create conversation area ${_requestData.conversationArea.label} with topic ${_requestData.conversationArea.topic}`
      : undefined,
  };
}

/**
 * An adapter between CoveyTownController's event interface (CoveyTownListener)
 * and the low-level network communication protocol
 *
 * @param socket the Socket object that we will use to communicate with the player
 */
function townSocketAdapter(socket: Socket): CoveyTownListener {
  return {
    onPlayerMoved(movedPlayer: Player) {
      socket.emit('playerMoved', movedPlayer);
    },
    onPlayerDisconnected(removedPlayer: Player) {
      socket.emit('playerDisconnect', removedPlayer);
    },
    onPlayerJoined(newPlayer: Player) {
      socket.emit('newPlayer', newPlayer);
    },
    onTownDestroyed() {
      socket.emit('townClosing');
      socket.disconnect(true);
    },
    onConversationAreaDestroyed(conversation: ServerConversationArea, townID: string) {
      socket.emit('conversationDestroyed', conversation);
      socket.leave(townID.concat(conversation.label));

      // clear local storage key value pair of sent data string for all connected clients
      socket.emit('clear-local', townID.concat(conversation.label));
    },
    onConversationAreaUpdated(conversation: ServerConversationArea) {
      socket.emit('conversationUpdated', conversation);
    },
    /**
     * makes sure the socket is not still connected to the room if a player leaves 
     *
     * @param room The room or subset of sockets that should receive the LineData
     * @param curConv list of sockets for a conversation area
     */
    onSocketRoomUpdated(room: string, curConv: Socket[]) {
      if (curConv.indexOf(socket) === -1) {
        socket.leave(room);
      }
    },
    onChatMessage(message: ChatMessage) {
      socket.emit('chatMessage', message);
    },
    /**
     * on receiving a drawing event, emit to sockets connected to specified room
     *
     * @param data The LineData representing a line on the canvas 
     * @param room The room or subset of sockets that should receive the LineData
     */
    onDrawing(data: LineData, room: string) {

      // check if the current listener's socket is in the room
      if (Array.from(socket.rooms).indexOf(room) !== -1) {
        socket.to(room).emit('drawing', data);
      }
    },
  
    /**
     * join the room if socket is in the whiteboard and send back canvas data so they get updated current state of canvas on join
     *
     * @param roomName room or subset of sockets that should contain curConv
     * @param curConv list of sockets for a conversation area
     * @param canvas base64 encoded string canvas state
     */
    onJoin(roomName: string, curConv: Socket[], canvas: string) {

      // check if socket is not already conencted to specified room, and if listener socket is in the list of sockets for the conversation Area
      if (Array.from(socket.rooms).indexOf(roomName) === -1 && curConv.indexOf(socket) !== -1) {
        socket.join(roomName);
      }

      // check if the current listener's socket is in the list of sockets for the conversation Area
      if (curConv.indexOf(socket) !== -1) {
        socket.emit('canvas-data', canvas);
      }
    },

  };
}

/**
 * A handler to process a remote player's subscription to updates for a town
 *
 * @param socket the Socket object that we will use to communicate with the player
 */
export function townSubscriptionHandler(socket: Socket): void {
  // Parse the client's session token from the connection
  // For each player, the session token should be the same string returned by joinTownHandler
  const { token, coveyTownID } = socket.handshake.auth as { token: string; coveyTownID: string };

  const townController = CoveyTownsStore.getInstance().getControllerForTown(coveyTownID);

  // Retrieve our metadata about this player from the TownController
  const s = townController?.getSessionByToken(token);
  if (!s || !townController) {
    // No valid session exists for this token, hence this client's connection should be terminated
    socket.disconnect(true);
    return;
  }


  s.socket = socket;

  // Create an adapter that will translate events from the CoveyTownController into
  // events that the socket protocol knows about
  const listener = townSocketAdapter(socket);
  townController.addTownListener(listener);

  // Register an event listener for the client socket: if the client disconnects,
  // clean up our listener adapter, and then let the CoveyTownController know that the
  // player's session is disconnected
  socket.on('disconnect', () => {
    townController.removeTownListener(listener);
    townController.destroySession(s);
  });

  socket.on('chatMessage', (message: ChatMessage) => {
    townController.onChatMessage(message);
  });

  // Register an event listener for the client socket: if the client updates their
  // location, inform the CoveyTownController
  socket.on('playerMovement', (movementData: UserLocation) => {
    townController.updatePlayerLocation(s.player, movementData);
  });

  // Registern an event listener for the client socket: if the client is drawing
  socket.on('drawing', (data: LineData, room: string) => {
    townController.onDrawing(data, room);
  });

  // Registern an event listener for the client socket: if the client opens/initializes the whiteboard 
  socket.on('join', (roomName: string, curConvPlayerIDs: string[]) => {
    townController.onJoin(roomName, curConvPlayerIDs);
  });

  // Register an event lsitener for the client socket: if the client creates a line stroke on the canvas
  socket.on('canvas-data', (data: string, curConvLabel: string) => {
    townController.onUpdate(data, curConvLabel);
  });

}
