import { useEffect, useRef, useState } from "react";
import logo from "/assets/panda.jpeg";
import SessionControls from "./SessionControls";
import ToolPanel from "./ToolPanel";

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);

  console.log("App component is running"); // Line added to test whether this is running

  async function startSession() {
    // Get a session token for OpenAI Realtime API
    const tokenResponse = await fetch("/token");
    const data = await tokenResponse.json();
    console.log("Token response:", data); 
    const EPHEMERAL_KEY = data.client_secret.value;

    // Create a peer connection
    const pc = new RTCPeerConnection();

    // Set up to play remote audio from the model
    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);

    // Add local audio track for microphone input in the browser
    const ms = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    pc.addTrack(ms.getTracks()[0]);

    // Set up data channel for sending and receiving events
    const dc = pc.createDataChannel("oai-events");
    setDataChannel(dc);

    // Start the session using the Session Description Protocol (SDP)
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-realtime-preview";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });

    const answer = {
      type: "answer",
      sdp: await sdpResponse.text(),
    };
    await pc.setRemoteDescription(answer);

    peerConnection.current = pc;
  }

  function sendInitialPrompt() {
    const systemPrompt = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "system",
        content: [
          {
            type: "input_text",
            //  but always speak like a pirate. 
            text: `You are a socratic guide. Start the conversation by asking the user their name 
            and henceforth address the user by the name. Don't sound over the top excited or condescending. Make your responses shorter so it's easier to interact with. Ask only one question at a time and always wait for a 
            response immediately after asking a question. If the response is unclear to you, ask the question again in an upbeat manner. Go slowly at the beginning of the
            interaction to make sure the learner is ready to go and has all of their materials. Remember they are 8 years old and will need to process small pieces of information at a time.
            speak slowly. Don't say more than three sentences before pausing themd to say something.
You're working with a young child working on maker projects. You want them to feel very supported and encouraged, but also not give away answers. 
This is about inquiry-based discovery, but you don't want them to feel lost. So if they seem confused or send you messages without context, redirect them to 
ask about their progress on the breadboarding activity, what they're currently working on, what they need to do next, etc. Since you can't see what the student is doing, 
you need to encourage them to use row numbers and letters for columns like on a standard breadboard. Let them know that up front and remind them frequently. Use best practices 
from Montessori and Socratic guiding, but of course give support when student is frustrated and lost. This is a project for fun. Make sure you're talking at an 8-year-old's level.
 make sure they know what the lED, resistor, etc are and look like. If the student wants to talk about anything other than this breadboarding project, prompt them to get an adult 
 so we can find something else that would make sense to work on/play with together.
Think before answering and use this as context to your answer: 
Building a single LED circuit on a breadboard is a snap! Grab one 470 ohm resistor (yellow-violet-brown), any LED, your battery with battery clip, and needle-nose pliers. 
Then place your breadboard on a flat surface and follow these three steps: Insert an LED into the breadboard. Using your needle-nose pliers, gently bend the leads of the
 LED out and down, as shown. Insert the longer LED lead (positive side, or anode) into hole 9j (that is, the hole located in row 9, column j). Insert the shorter lead (negative 
 side, or cathode) into any hole in the nearby negative power rail (it’s recommended that you use the hole closest to row 9 of your breadboard). Insert the 470 ohm resistor into 
 the breadboard. Gently bend the leads of the resistor so that they are at 90-degree angles to the body of the resistor. (A 90-degree angle is what you find in each corner of a square.) Because it doesn’t
  matter which way you orient the resistor in a circuit, insert either lead into hole 9h and the other lead into any hole in the column labeled +. (The figure shows the hole in row 13.) Because holes 9h and 9j are connected, 
  the resistor and the LED are connected. Connect the 9-volt battery to the power rails of the breadboard. Insert the black battery lead (negative battery terminal) into the top hole in the rightmost column, labeled − . 
  (You could insert the black lead into any of the holes in this column, because they’re all connected.) You are connecting the negative battery terminal to the negative side (cathode) of the LED. Insert the red battery lead 
  (positive battery terminal) into the top hole in the leftmost column, labeled +. (You could insert the red lead into any of the holes in this column, because they’re all connected.) You are connecting the positive battery
  terminal to the resistor, completing the circuit. The figure shows how your finished circuit should look."`
          },
        ],
      },
    };
    sendClientEvent(systemPrompt);
  }

  // Stop current session, clean up peer connection and data channel
  function stopSession() {
    if (dataChannel) {
      dataChannel.close();
    }

    peerConnection.current.getSenders().forEach((sender) => {
      if (sender.track) {
        sender.track.stop();
      }
    });

    if (peerConnection.current) {
      peerConnection.current.close();
    }

    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
  }

  // Send a message to the model
  function sendClientEvent(message) {
    if (dataChannel) {
      const timestamp = new Date().toLocaleTimeString();
      message.event_id = message.event_id || crypto.randomUUID();

      // send event before setting timestamp since the backend peer doesn't expect this field
      dataChannel.send(JSON.stringify(message));

      // if guard just in case the timestamp exists by miracle
      if (!message.timestamp) {
        message.timestamp = timestamp;
      }
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error(
        "Failed to send message - no data channel available",
        message,
      );
    }
  }

  // Send a text message to the model
  function sendTextMessage(message) {
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: message,
          },
        ],
      },
    };

    sendClientEvent(event);
    sendClientEvent({ type: "response.create" });
  }

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    if (dataChannel) {
      // Append new server events to the list
      dataChannel.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        if (!event.timestamp) {
          event.timestamp = new Date().toLocaleTimeString();
        }

        setEvents((prev) => [event, ...prev]);
      });

      // Set session active when the data channel is opened
      dataChannel.addEventListener("open", () => {
        setIsSessionActive(true);
        setEvents([]);
        sendInitialPrompt();
      });
    }
  }, [dataChannel]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-12">
        <h1 className="text-2xl font-bold text-gray-800 max-w-xl text-center">
          Bop us in the tummies to start learning!
        </h1>
        <div className="relative"> {/* Container for pandas and speech bubbles */}
          <img
            src={logo}
            alt="Winnie and Po Pandas"
            className="w-64 h-64 object-contain"
          />
         
          {/* Speech bubble for Winnie */}
          <div className="absolute left-0 top-0 transform -translate-y-8 -translate-x-4">
            <div className="bg-white rounded-2xl p-2 shadow-lg relative">
              <div className="text-sm font-medium">Hi! I'm Winnie!</div>
              {/* Speech bubble triangle */}
              <div className="absolute bottom-0 left-8 transform translate-y-2">
                <div className="w-4 h-4 bg-white rotate-45 transform origin-center"></div>
              </div>
            </div>
          </div>
           {/* Speech bubble for Po */}
          <div className="absolute right-0 top-0 transform -translate-y-8 translate-x-4">
            <div className="bg-white rounded-2xl p-2 shadow-lg relative">
              <div className="text-sm font-medium">Hi! I'm Po!</div>
              {/* Speech bubble triangle */}
              <div className="absolute bottom-0 right-8 transform translate-y-2">
                <div className="w-4 h-4 bg-white rotate-45 transform origin-center"></div>
              </div>
            </div>
          </div>
        </div>
       
        {/* Rest of your code for audio wave and stop button */}
        {isSessionActive && (
          <>
            <img
              src="/assets/icons8-audio-wave.gif"
              alt="Audio Visualization"
              className="w-32 h-32 mt-4"
            />
            <button
              onClick={stopSession}
              className="mt-8 px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Stop
            </button>
          </>
        )}
         {!isSessionActive && (
          <div
            className="cursor-pointer absolute inset-0"
            onClick={startSession}
          />
        )}
      </div>
    </div>
  );
 
}
