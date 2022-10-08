
import React, { useEffect, useState } from 'react';
import {Box, Heading, UnorderedList, ListItem} from '@chakra-ui/react';
import useConversationAreas from '../../hooks/useConversationAreas'
import usePlayersInTown from '../../hooks/usePlayersInTown'
import PlayerName from './PlayerName';
import ConversationArea from '../../classes/ConversationArea';

type ConversationAreaProps = {
  area: ConversationArea
  playerID: string
  setShowButton: React.Dispatch<React.SetStateAction<boolean>>
  setCurrentConv: React.Dispatch<React.SetStateAction<ConversationArea | undefined>>
    
  
}

/**
 * Define a conversationArea component that wraps every conversationArea 
 * @param area a conversationArea 
 * @param playerID current player id 
 * @param setShowButton set to true if is the right place to show button
 * @param setCurrentConv current conversation area 
 * 
 * @returns a list of player that would display on the sidebar 
 */
function ConversationAreaComponent({area, playerID, setShowButton, setCurrentConv} : ConversationAreaProps): JSX.Element {

  const playersInTown = usePlayersInTown();
  const [playerIdList, setPlayerIdList] = useState(area.occupants)

  function updatePlayerList(playersId: string[]) {
   setPlayerIdList(playersId);
  }

      useEffect(()=>{
        const updateListener = {
          onOccupantsChange: (newOccupants: string[]) => {
          
          updatePlayerList(newOccupants);

          // check if the current player is in certain conversation area 
          // find the current conversation area that player is located in
          // setShowButton to true if the player is in that conversation area 
          if (newOccupants.includes(playerID)) {
            setShowButton(true);
            setCurrentConv(area);
          }
  
          },
        };
        area.addListener(updateListener);
        updateListener.onOccupantsChange(area.occupants);

        return function cleanup() {
          area.removeListener(updateListener)
        }
        
      }, [area, playerID, setCurrentConv, setShowButton]); 
      
      const existedPlayerList = []
      for (let i = 0; i < playerIdList.length; i += 1) {
          for (let j = 0; j < playersInTown.length; j += 1){
      
            if(playerIdList[i] === playersInTown[j].id) {
              existedPlayerList.push(playersInTown[j]);
              break 
            } 
          }
        }

      const playerNameList = existedPlayerList.map(
       i => (<ListItem key={i.userName}><PlayerName player={i}/></ListItem>)
     )

  
  return <Box>
    <Heading as='h3' fontSize='md'>{area.label}: {area.topic}</Heading>
    <UnorderedList>
        {playerNameList}
      </UnorderedList>
  </Box>
}

type ConversationAreaListProps = {
  playerID: string
  setShowButton: React.Dispatch<React.SetStateAction<boolean>>
  setCurrentConv: React.Dispatch<React.SetStateAction<ConversationArea | undefined>>
}
/**
 * Displays a list of "active" conversation areas, along with their occupants 
 * 
 * A conversation area is "active" if its topic is not set to the constant NO_TOPIC_STRING that is exported from the ConverationArea file
 * 
 * If there are no active conversation areas, it displays the text "No active conversation areas"
 * 
 * If there are active areas, it sorts them by label ascending, using a numeric sort with base sensitivity
 * 
 * Each conversation area is represented as a Box:
 *  With a heading (H3) `{conversationAreaLabel}: {conversationAreaTopic}`,
 *  and an unordered list of occupants.
 * 
 * Occupants are *unsorted*, appearing in the order 
 *  that they appear in the area's occupantsByID array. Each occupant is rendered by a PlayerName component,
 *  nested within a ListItem.
 * 
 * Each conversation area component must subscribe to occupant updates by registering an `onOccupantsChange` listener on 
 *  its corresponding conversation area object.
 * It must register this listener when it is mounted, and remove it when it unmounts.
 * 
 * See relevant hooks: useConversationAreas, usePlayersInTown.
 */
export default function ConversationAreasList({playerID, setShowButton, setCurrentConv}: ConversationAreaListProps): JSX.Element {
  const conversationAreaList = useConversationAreas();

  if (conversationAreaList.length === 0){
    return <Heading as='h2' fontSize='md'>No active conversation areas</Heading>;
  }
  
  const activeConversationAreaList = []
  for (let i = 0; i < conversationAreaList.length; i+=1) {
    if (conversationAreaList[i].topic !== 'NO_TOPIC_STRING') {
      activeConversationAreaList.push(conversationAreaList[i])
    }
  }

  if(activeConversationAreaList.length === 0) {
    return <Heading as='h2' fontSize='md'>No active conversation areas</Heading>;
  }
  

    const sortedConversationAreaList = [...activeConversationAreaList].sort((a,b)=>a.label.localeCompare(b.label, 'en', { numeric: true }));
  
    const conversationAreaComponentList = sortedConversationAreaList.map(
      i => (<ConversationAreaComponent key = {i.label} area={i} playerID={playerID} setShowButton={setShowButton} setCurrentConv={setCurrentConv}/>)
    )

    return <>{conversationAreaComponentList}</>    
  
}
