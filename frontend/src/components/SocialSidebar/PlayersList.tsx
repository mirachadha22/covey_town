import React from 'react';
import { Heading, ListItem, OrderedList, Tooltip } from '@chakra-ui/react';
import usePlayersInTown from '../../hooks/usePlayersInTown'
import PlayerName from './PlayerName';
import useCoveyAppState from '../../hooks/useCoveyAppState'


/**
 * Lists the current players in the town, along with the current town's name and ID
 * 
 * Town name is shown in an H2 heading with a ToolTip that shows the label `Town ID: ${theCurrentTownID}`
 * 
 * Players are listed in an OrderedList below that heading, sorted alphabetically by userName (using a numeric sort with base precision)
 * 
 * Each player is rendered in a list item, rendered as a <PlayerName> component
 * 
 * See `usePlayersInTown` and `useCoveyAppState` hooks to find the relevant state.
 * 
 */
export default function PlayersInTownList(): JSX.Element {
  const playerList = usePlayersInTown();
  const sortedList = [...playerList].sort((a,b)=>a.userName.localeCompare(b.userName, 'en', { numeric: true }));
  const currentTown = useCoveyAppState();
  const townName = currentTown.currentTownFriendlyName
  const townID = currentTown.currentTownID
  const label = `Town ID: ${townID}`


  return (
    <>
      <Tooltip label={label}><Heading as='h2' fontSize='md'>Current town: {townName}</Heading></Tooltip>
      <OrderedList>
        {sortedList.map(
          i => (<ListItem key={i.userName}><PlayerName player={i}/></ListItem>)
        )}
      </OrderedList>
    </>
  )
}


