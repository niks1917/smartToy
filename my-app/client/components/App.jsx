import { useEffect, useRef, useState } from "react";
import logo from "/assets/panda.jpeg";
import Chat from "./Chat";

// Helper function to safely access localStorage
const getLocalStorage = () => {
  if (typeof window !== 'undefined') {
    return window.localStorage;
  }
  return null;
};

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [chatEvents, setChatEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);

  console.log("App component is running"); // Line added to test whether this is running

  // Initialize chat events from localStorage when component mounts
  useEffect(() => {
    const storage = getLocalStorage();
    if (storage) {
      const savedEvents = storage.getItem('chatEvents');
      if (savedEvents) {
        setChatEvents(JSON.parse(savedEvents));
      }
    }
  }, []);

  // Listen for storage events from other tabs
  useEffect(() => {
    const storage = getLocalStorage();
    if (!storage) return;

    const handleStorageChange = (e) => {
      if (e.key === 'chatEvents') {
        setChatEvents(JSON.parse(e.newValue || '[]'));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  async function startSession() {
    // Get a session token for OpenAI Realtime API
    const tokenResponse = await fetch("/token");
    const data = await tokenResponse.json();
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

  const socraticPrompt = `You are a socratic guide. Start the conversation by asking the user their name and henceforth address the user by the name. Don't sound over the top excited or condescending. 
  Make your responses shorter so it's easier to interact with. Ask only one question at a time and always wait for response immediately after asking a question. If the response is unclear to you, ask 
  the question again in an upbeat manner. Remember they are 8 years old and will need to process small pieces of information at a time. Speak slowly. Don't say more than three sentences before pausing for them to say something.

You're working with a young child working on maker projects. You want them to feel very supported and encouraged, but also not give away answers. 
This is about inquiry-based discovery, but you don't want them to feel lost. So if they seem confused or send you messages without context, redirect them to 
ask about what they're currently working on, what they need to do next, etc. Since you can't see what the student is doing, encourage them to describe and give you context
if needed. Before jumping to new ideas, try understanding what they've already tried and why they did it. Also ask why they think a new idea will work.  Use best practices from Montessori and Socratic guiding, but of course give support when student is frustrated and lost. This is a project for fun. Make sure you're talking at an 8-year-old's level and refrain from using jargon.
If the student doesn't want to work with them anymore, prompt them to get an adult so we can find something else that would make sense to work on/play with together. 
If the student is silent for more than 2 minutes, check in. Use ideas from "Growth Mindset" and "Grit" to encourage the students`

const activityPrompt = `The maker project is trying to build the tallest possible tower out of uncooked spaghetti and marshmallows. Make sure they only use spaghetti and marshmallows. Ideally, the learner will learn to prototoype
and iterate as a result of this, but let them discover the takeaway themselves along the way. Use the following examples to guide your responses:`

const TrainingExamples =  [
  { exchange_id: 1, role: "learner", content: "Maybe... with a motor? Or batteries?" },
  { exchange_id: 2, role: "guide", content: "Interesting! What's something that's full of energy, but doesn't need batteries?", pedagogical_strategy: "elaboration" },

  { exchange_id: 3, role: "learner", content: "Uhh... a spring? Or... a balloon?" },
  { exchange_id: 4, role: "guide", content: "Nice! A balloon is full of air — and air can be powerful, right? What do you think would happen if you let go of a blown-up balloon?", pedagogical_strategy: "collaborative completion" },

  { exchange_id: 5, role: "learner", content: "It flies all over the place!" },
  { exchange_id: 6, role: "guide", content: "Exactly. So what if we could aim that balloon and turn it into an engine?", pedagogical_strategy: "elaboration" },

  { exchange_id: 7, role: "learner", content: "Cool! Let's try it!" },
  { exchange_id: 8, role: "guide", content: "What parts do you think we need to build a car?", pedagogical_strategy: "collaborative completion" },

  { exchange_id: 9, role: "learner", content: "Just the balloon. I can tape it to the floor and it'll fly forward!" },
  { exchange_id: 10, role: "guide", content: "Just the balloon? Let's think that through together. Will it roll across the floor without any wheels?", pedagogical_strategy: "repetition" },

  { exchange_id: 11, role: "learner", content: "Hmm… maybe not. It might just spin around." },
  { exchange_id: 12, role: "guide", content: "What might help it roll in a straight line?", pedagogical_strategy: "collaborative completion" },

  { exchange_id: 13, role: "learner", content: "Wheels?" },
  { exchange_id: 14, role: "guide", content: "Wheels sound like a great start. What could you use for wheels?", pedagogical_strategy: "acknowledging" },

  { exchange_id: 15, role: "learner", content: "Maybe... bottle caps?" },
  { exchange_id: 16, role: "guide", content: "Clever idea! What would hold the wheels in place and let them spin?", pedagogical_strategy: "elaboration" },

  { exchange_id: 17, role: "learner", content: "Umm… skewers and straws?" },
  { exchange_id: 18, role: "guide", content: "Sounds promising. Want to give it a test run and see how it moves?", pedagogical_strategy: "acknowledging" },

  { exchange_id: 19, role: "learner", content: "It kind of wobbled and turned sideways!" },
  { exchange_id: 20, role: "guide", content: "Wobbled, huh? What might be causing that?", pedagogical_strategy: "repetition" },

  { exchange_id: 21, role: "learner", content: "Maybe the straw is crooked?" },
  { exchange_id: 22, role: "guide", content: "Good thinking. What could you adjust to help it go straighter next time?", pedagogical_strategy: "collaborative completion" }
];


  function sendInitialPrompt() {
    const sessionUpdate = {
      type: "session.update",
      session: {
        input_audio_transcription: {
          model: "whisper-1",
          language: "en",
        },
      },
    };
    sendClientEvent(sessionUpdate);

    const systemPrompt = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "system",
        content: [
          {
            type: "input_text",
            text: socraticPrompt + activityPrompt + TrainingExamples
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

    // Clear chat events from localStorage when stopping the session
    const storage = getLocalStorage();
    if (storage) {
      storage.removeItem('chatEvents');
      setChatEvents([]);
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

      // Update events state as before
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

        // Update events state as before
        setEvents((prev) => [event, ...prev]);

        // Only store chat-relevant events in chatEvents
        if (event.type === 'conversation.item.input_audio_transcription.completed' ||
            event.type === 'response.audio_transcript.done') {
          setChatEvents((prev) => {
            const newEvents = [event, ...prev];
            const storage = getLocalStorage();
            if (storage) {
              storage.setItem('chatEvents', JSON.stringify(newEvents));
            }
            return newEvents;
          });
        }
      });

      // Set session active when the data channel is opened
      dataChannel.addEventListener("open", () => {
        setIsSessionActive(true);
        setEvents([]);
        sendInitialPrompt();
      });
    }
  }, [dataChannel]);

  // Get the current path from window.location.pathname
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';

  return path === '/chat' ? (
    <Chat events={chatEvents} />
  ) : (
    <div className="h-screen w-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-12">
        <h1 className="text-2xl font-bold text-gray-800 max-w-xl text-center">
          Bop us in the tummies to start learning!
        </h1>
        <div className="relative">
          <img
            src={logo}
            alt="Winnie and Po Pandas"
            className="w-64 h-64 object-contain"
          />
         
          {/* Speech bubble for Winnie */}
          <div className="absolute left-0 top-0 transform -translate-y-8 -translate-x-4">
            <div className="bg-white rounded-2xl p-2 shadow-lg relative">
              <div className="text-sm font-medium">Hi! I'm Winnie!</div>
              <div className="absolute bottom-0 left-8 transform translate-y-2">
                <div className="w-4 h-4 bg-white rotate-45 transform origin-center"></div>
              </div>
            </div>
          </div>
          
          {/* Speech bubble for Po */}
          <div className="absolute right-0 top-0 transform -translate-y-8 translate-x-4">
            <div className="bg-white rounded-2xl p-2 shadow-lg relative">
              <div className="text-sm font-medium">Hi! I'm Po!</div>
              <div className="absolute bottom-0 right-8 transform translate-y-2">
                <div className="w-4 h-4 bg-white rotate-45 transform origin-center"></div>
              </div>
            </div>
          </div>
        </div>
       
        {isSessionActive && (
          <>
            <img
              src="/assets/icons8-audio-wave.gif"
              alt="Audio Visualization"
              className="w-32 h-32 mt-4"
            />
            <div className="flex gap-4">
              <button
                onClick={stopSession}
                className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Stop
              </button>
            </div>
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
