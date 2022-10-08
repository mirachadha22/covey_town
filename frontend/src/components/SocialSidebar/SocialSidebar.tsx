import { Heading, StackDivider, VStack } from '@chakra-ui/react';
import React from 'react';
import ConversationArea from '../../classes/ConversationArea';
import ConversationAreasList from './ConversationAreasList';
import PlayersList from './PlayersList';

type SocialSidebarProps = {
  playerID: string
  setShowButton: React.Dispatch<React.SetStateAction<boolean>>
  setCurrentConv: React.Dispatch<React.SetStateAction<ConversationArea | undefined>>
}

/**
 * Define a sidebar component that wraps every conversationAreaList and PlayerList
 * 
 * @param playerID current players ID
 * @param setShowButton set to true if is the right place to show button
 * @param setCurrentConvcurrent current conversation area 
 * 
 * @returns a sidebar component that keep track of mutations of players and conversations in the town
 * 
 */
export default function SocialSidebar({playerID, setShowButton, setCurrentConv} : SocialSidebarProps): JSX.Element {
    return (
      <VStack align="left"
        spacing={2}
        border='2px'
        padding={2}
        marginLeft={2}
        borderColor='gray.500'
        height='100%'
        divider={<StackDivider borderColor='gray.200' />}
        borderRadius='4px'>
          <Heading fontSize='xl' as='h1'>Players In This Town</Heading>
        <PlayersList />
        <ConversationAreasList playerID={playerID} setShowButton={setShowButton} setCurrentConv={setCurrentConv} />
      </VStack>
    );
  }
