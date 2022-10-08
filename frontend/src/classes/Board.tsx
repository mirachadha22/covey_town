import React, { useEffect, useRef, useState } from 'react';
import '../board.css';
import ConversationArea from './ConversationArea';
import useCoveyAppState from '../hooks/useCoveyAppState';
import blackMarker from '../images/marker_black.png';
import blueMarker from '../images/marker_blue.png';
import greenMarker from '../images/marker_green.png';
import redMarker from '../images/marker_red.png';
import yellowMarker from '../images/marker_yellow.png';
import eraser from '../images/eraser.png';

// saves color type, size, and position
type CurrentLineProps = {
  color: string;
  x?: number;
  y?: number;
  size: number;
};

// saves color type, start and end points, and size
type LineData = {
  color: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  size: number;
};

// BoardProps takes in the current Conversation Area and the current town's ID
type BoardProps = {
  curConversation: ConversationArea | undefined;
  curTownId: string | undefined;
};

/**
 * Define a functional react component board 
 * 
 * @param curConversation current conversation area 
 * @param curTownId current Town ID
 */
export default function Board({ curConversation, curTownId }: BoardProps): JSX.Element {

  // this boolean will be true when the socket should emit
  let emitTheData = false;

  // initializing data
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorOptionsRef = useRef<HTMLDivElement>(null);
  const otherOptionsRef = useRef<HTMLDivElement>(null);
  const { socket } = useCoveyAppState();

  // if the socket is defined...
  if (socket) {

    // if the current CA and town are defined ...
    if (curConversation && curTownId) {

      // join event -> args: ROOM name and conversation occupants by ID
      socket.emit('join', curConversation.label.concat(curTownId), Array.from(curConversation.occupants))

      // emitted from server after room joined
      socket.on('canvas-data', (dataString: string | null) => {
        if (dataString !== null) {
          const myImage = new Image();
          myImage.onload = function () {
            // context!.drawImage(myImage, 0, 0);
            const context = canvasRef.current?.getContext('2d')

            context?.drawImage(myImage, 0, 0);
          };
          myImage.src = dataString;
        }
      });

      socket.on('clear-local', (room: string) => {
        window.localStorage.removeItem(room);
      })

    }

  }

  useEffect(() => {

    // --------------- getContext() method returns a drawing context on the canvas-----

    const canvas = canvasRef?.current;

    if (canvas) {

      const context = canvas.getContext('2d');

      // ----------------------- Colors --------------------------------------------------

      const colors = document.getElementsByClassName('color');    // gets color elements
      const extras = document.getElementsByClassName('extra');    // gets download, change size, and clear elements

      const current: CurrentLineProps = {   // set the default color & size
        color: 'black',
        size: 2,
      };

      let drawing = false;

      // ------------------------------- create the drawing ----------------------------

      // draw a line on the canvas
      const drawLine = (
        x0: number,
        y0: number,
        x1: number,
        y1: number,
        color: string,
        size: number,
        emit: boolean | undefined,
      ) => {

        if (context) {
          context.beginPath();
          context.moveTo(x0, y0);
          context.lineTo(x1, y1);
          context.strokeStyle = color;
          context.lineWidth = size;
          context.stroke();
          context.closePath();
        }

        if (!emit) {
          return;
        }
        const w = canvas.width;
        const h = canvas.height;

        // if conditioins hold, then emit what was just drawn
        if (socket && curConversation && curTownId && emitTheData) {
          socket.emit('drawing', {
            x0: x0 / w,
            y0: y0 / h,
            x1: x1 / w,
            y1: y1 / h,
            color,
            size,
          }, curConversation.label.concat(curTownId));
        }
      };

      // ------------------------------- button functionalities ----------------------------

      // erase the whole board with a bunch of "eraser" lines
      const eraseTheWholeBoard = (e: Event) => {

        // begin emitting data
        emitTheData = true;

        // save the old state of the pen (color & size)
        const oldColor = current.color;
        const oldSize = current.size;

        const w = canvas.width;
        const h = canvas.height;

        // set the pen to be a really big eraser
        const newColor = 'white';
        const newPenSize = w / 20;

        current.color = newColor;
        current.size = newPenSize

        // erase the board in a bunch of little lines
        for (let startingX = newPenSize / 2; startingX <= w; startingX += (current.size - (current.size / 8))) {
          for (let startingY = 0; startingY <= h; startingY += (h / 25)) {
            drawLine(startingX, startingY, startingX, startingY + (h / 20), current.color, current.size, true);
          }
        }

        // set the pen back to its previous state
        current.color = oldColor;
        current.size = oldSize;

        // stop emitting data
        emitTheData = false;

        // save current state of canvas in local storage
        if (curConversation !== undefined && curTownId !== undefined) {
          window.localStorage.setItem(curTownId.concat(curConversation?.label), canvas.toDataURL());

          // Updates the backend on what the current canvas-data is for this conversation area / board
          socket?.emit('canvas-data', canvas.toDataURL(), curConversation.label.concat(curTownId))
        }

      }

      // helper that will clear what's currently on the canvas
      const onClear = (e: Event) => {
        eraseTheWholeBoard(e);
      }

      // helper that will update the pen size
      const onSizeUpdate = (e: Event) => {
        const sizeTarget = e.target as HTMLElement;
        let changeSize = '';
        changeSize = sizeTarget.innerHTML; // eslint-disable-line prefer-destructuring

        if (changeSize === '+' && current.size <= 16) {           // line shouldn't exceed 18 px width
          current.size += 2;
        } else if (changeSize === '-' && current.size >= 4) {     // line shouldn't be smaller than 2 px width
          current.size -= 2;
        }

        if (context) {
          context.lineWidth = current.size;                       // set the line size
        }
      };

      // helper that will download the image
      const onDownload = (e: Event) => {

        // to create white background
        const imgData = context!.getImageData(0,0,canvas.width,canvas.height);
        const { data } =imgData;
        for(let i=0;i<data.length;i+=4){
          if(data[i+3]<255){
            data[i]=255;
            data[i+1]=255;
            data[i+2]=255;
            data[i+3]=255;
          }
        }
        context!.putImageData(imgData,0,0);

        const link = document.createElement('a');

        // add timestamp to png file name
        const date = new Date();
        const dateString = date.toISOString();
        link.download = `whiteboard ${dateString}.jpg`;

        // save canvas as transparent png
        link.href = canvas.toDataURL('image/jpeg');
        link.click();
        link.remove();
      };

      // calls specific helper method based on which button has been pressed.
      // code was necessary to implement this way because all "extra" buttons had to be grouped together for CSS styling
      const onExtra = (e: Event) => {
        const target = e.target as HTMLElement;
        const type = target.innerHTML;

        if (type === '-' || type === '+') {
          onSizeUpdate(e);
        } else if (type === 'download') {
          onDownload(e);
        } else if (type === 'clear') {
          onClear(e);
        }
      }

      // helper that will update the current color
      const onColorUpdate = (e: Event) => {
        const colorTarget = e.target as HTMLElement;
        current.color = colorTarget.id;
      };

      // loop through the color elements and add the click event listeners
      for (let i = 0; i < colors.length; i += 1) {
        colors[i].addEventListener('click', onColorUpdate, false);
      }

      // loop through the extra elements and add the click event listeners
      for (let i = 0; i < extras.length; i += 1) {
        extras[i].addEventListener('click', onExtra, false);
      }

      // ---------------- mouse movement --------------------------------------

      // what to do when the mouse presses down
      const onMouseDown = (e: MouseEvent | TouchEvent) => {
        drawing = true;

        if (e instanceof MouseEvent) {        // on computer (using mouse)
          current.x = e.clientX;
          current.y = e.clientY;
        } else {                              // on mobile (using touch)
          current.x = e.touches[0].clientX;
          current.y = e.touches[0].clientY;
        }

        emitTheData = true;

      };

      // what to do when the moouse is moving
      const onMouseMove = (e: MouseEvent | TouchEvent) => {

        if (!drawing) {                       // only run if the mouse is down
          return;
        }

        if (!current.x || !current.y) {
          return;
        }

        // draw thee line!
        if (e instanceof MouseEvent) {
          drawLine(current.x, current.y, e.clientX, e.clientY, current.color, current.size, true);
          current.x = e.clientX;
          current.y = e.clientY;
        } else {
          drawLine(current.x, current.y, e.touches[0].clientX, e.touches[0].clientY, current.color, current.size, true);
          current.x = e.touches[0].clientX;
          current.y = e.touches[0].clientY;
        }
      };

      // what to do if the mouse lifts up
      const onMouseUp = (e: MouseEvent | TouchEvent) => {

        if (!drawing) {                       // only run if the mouse was previously down
          return;
        }

        drawing = false;

        if (!current.x || !current.y) {
          return;
        }

        // finish the line
        if (e instanceof MouseEvent) {
          drawLine(current.x, current.y, e.clientX, e.clientY, current.color, current.size, true);
        } else {
          drawLine(current.x, current.y, e.touches[0].clientX, e.touches[0].clientY, current.color, current.size, true);
        }

        // save current state of canvas in local storage
        if (curConversation !== undefined && curTownId !== undefined) {
          window.localStorage.setItem(curTownId.concat(curConversation?.label), canvas.toDataURL());

          // Updates the backend on what the current canvas-data is for this conversation area / board
          socket?.emit('canvas-data', canvas.toDataURL(), curConversation.label.concat(curTownId))

        }

        // tell the socket to stop emitting the data
        emitTheData = false;

      };

      // ----------- limit the number of events per second -----------------------

      const throttle = (
        callback: {
          (e: MouseEvent | TouchEvent): void;
          (e: MouseEvent | TouchEvent): void;
          apply?: any; // eslint-disable-line  @typescript-eslint/no-explicit-any
        },
        delay: number,
      ) => {
        let previousCall = new Date().getTime();
        return function () {
          const time = new Date().getTime();

          if (time - previousCall >= delay) {
            previousCall = time;
            // note: we went to around four different TAs and spent hours on trying to figure out 
            // how to write this to ESLint's specifications. we were unsuccessful :(
            callback.apply(null, arguments); // eslint-disable-line no-eval, prefer-spread, prefer-rest-params
          }
        };
      };

      // -----------------add event listeners to our canvas ----------------------

      canvas.addEventListener('mousedown', onMouseDown, false);
      canvas.addEventListener('mouseup', onMouseUp, false);
      canvas.addEventListener('mouseout', onMouseUp, false);
      canvas.addEventListener('mousemove', throttle(onMouseMove, 5), false);

      // Touch support for mobile devices
      canvas.addEventListener('touchstart', onMouseDown, false);
      canvas.addEventListener('touchend', onMouseUp, false);
      canvas.addEventListener('touchcancel', onMouseUp, false);
      canvas.addEventListener('touchmove', throttle(onMouseMove, 5), false);

      // -------------- make the canvas fill its parent component -----------------

      // what to do if the canvvas gets resized
      const onResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;


        let dataString: string | null;
        dataString = null;

        // update the state saved in the local storage
        if (curConversation !== undefined && curTownId !== undefined) {
          dataString = window.localStorage.getItem(curTownId?.concat(curConversation?.label));
        }

        // re-onload the imagee
        const myImage = new Image();
        myImage.onload = function () {
          context?.drawImage(myImage, 0, 0);
        };
        if (dataString) {
          myImage.src = dataString;
        }
      };

      // add resize event listener
      window.addEventListener('resize', onResize, false);
      onResize();

      // ----------------------- socket.io connection ----------------------------
      const onDrawingEvent = (data: LineData) => {
        const w = canvas.width;
        const h = canvas.height;
        drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color, data.size, true);
      };

      if (socket) {
        socket.on('drawing', onDrawingEvent);

      }

    }

  }, [curConversation, curTownId, socket]);

  return (
    <div>
      <canvas ref={canvasRef} className='whiteboard' />

      <div ref={colorOptionsRef} className='colorOptions'>
        <div className='color black'>
          <img id='black' src={blackMarker} alt='black' />
        </div>
        <div className='color red'>
          <img id='red' src={redMarker} alt='red' />
        </div>
        <div className='color green'>
          <img id='green' src={greenMarker} alt='green' />
        </div>
        <div className='color blue'>
          <img id='blue' src={blueMarker} alt='blue' />
        </div>
        <div className='color yellow'>
          <img id='yellow' src={yellowMarker} alt='yellow' />
        </div>
        <div className='color white'>
          <img id='white' src={eraser} alt='eraser' />
        </div>
      </div>

      <div ref={otherOptionsRef} className='otherOptions'>

        <div className='extra decrease'>
          <p>-</p>
        </div>
        <div className='extra increase'>
          <p>+</p>
        </div>

        <div className='extra download'>
          <p>download</p>
        </div>

        <div className='extra clear'>
          <p>clear</p>
        </div>

      </div>
    </div>
  );
}
