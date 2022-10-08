import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react';
import React from 'react'; 
import ConversationArea from '../../classes/ConversationArea';
import Board from '../../classes/Board';
import Player from '../../classes/Player';

type WhiteBoardModalProps = {
  isOpen: boolean;
  closeModal: () => void;
  curConversationArea: ConversationArea | undefined;
  curTownId: string | undefined;
}

/**
 * Define a board pop out window   
 * 
 * @param isOpen 
 * @param closeModal 
 * @param curConversationArea current conversation area 
 * @param curTownId current town id
 * 
 * @returns a whiteboardmodal component that display whenever players hit "open" button
 * 
 */
export default function WhiteBoardModal({ isOpen, closeModal, curConversationArea, curTownId }: WhiteBoardModalProps): JSX.Element {

  return (
    <Modal size='full' isOpen={isOpen} onClose={closeModal} >

      <ModalOverlay />
      <ModalContent>

        <ModalHeader> Whiteboard </ModalHeader>

        <ModalBody>

          <div>
            <Board  curConversation={curConversationArea} curTownId={curTownId} />
          </div>


        </ModalBody>

        <ModalFooter>
          <Button onClick={closeModal}>Close</Button>
        </ModalFooter>

      </ModalContent>
    </Modal>
  );
}