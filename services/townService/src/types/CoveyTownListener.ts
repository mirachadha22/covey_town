import { Socket } from 'socket.io';
import { ServerConversationArea } from '../client/TownsServiceClient';
import { ChatMessage, LineData } from '../CoveyTypes';
import Player from './Player';

/**
 * A listener for player-related events in each town
 */
export default interface CoveyTownListener {
  /**
   * Called when a player joins a town
   * @param newPlayer the new player
   */
  onPlayerJoined(newPlayer: Player): void;

  /**
   * Called when a player's location changes
   * @param movedPlayer the player that moved
   */
  onPlayerMoved(movedPlayer: Player): void;

  /**
   * Called when a player disconnects from the town
   * @param removedPlayer the player that disconnected
   */
  onPlayerDisconnected(removedPlayer: Player): void;

  /**
   * Called when a town is destroyed, causing all players to disconnect
   */
  onTownDestroyed(): void;

  /**
   * Called when a conversation area is created or updated
   * @param conversationArea the conversation area that is updated or created
   */
  onConversationAreaUpdated(conversationArea: ServerConversationArea): void;

  /**
   * Called when a conversation area is destroyed
   * @param conversationArea the conversation area that has been destroyed
   */
  onConversationAreaDestroyed(conversationArea: ServerConversationArea, townID: string): void;

  /**
   * Called when a chat message is received from a user
   * @param message the new chat message
   */
  onChatMessage(message: ChatMessage): void;

  /**
   * Called when a drawing event is received from a user
   * @param message the new chat message
   */
  onDrawing(data: LineData, room: string): void;

  /**
   * Called when a room join request is received from a user
   * @param message the new chat message
   */
  onJoin(data: string, curConv: Socket[], canvas: string): void;

  /**
   * Called when a user leaves a conversation area and the room must be updated
   * @param message the new chat message
   */
  onSocketRoomUpdated(room: string, curConv: Socket[]): void;

}
