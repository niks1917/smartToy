import React, { useState, useEffect, useRef } from 'react';

// Helper function to safely access localStorage
const getLocalStorage = () => {
  if (typeof window !== 'undefined') {
    return window.localStorage;
  }
  return null;
};

export default function Chat({ events }) {
  const [chatEvents, setChatEvents] = useState([]);
  const [analysis, setAnalysis] = useState("Waiting for first analysis...");
  const chatEventsRef = useRef([]); // Add this ref to track latest chatEvents

  // Add ref for the messages container
  const messagesEndRef = useRef(null);

  // Add scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [chatEvents]);

  // Update chatEvents and ref when props change
  useEffect(() => {
    if (events) {
      setChatEvents(events);
      chatEventsRef.current = events; // Keep ref in sync
    }
  }, [events]);

  // Add the 2-minute interval for analysis - NO dependency on chatEvents
  useEffect(() => {
    console.log("Setting up interval");
    const intervalId = setInterval(async () => {
      console.log("Interval triggered, checking latest messages");
      
      // Use ref instead of state
      const currentEvents = chatEventsRef.current;
      console.log("Current chat events:", currentEvents);

      if (currentEvents && currentEvents.length > 0) {
        try {
          const messages = currentEvents.map(event => ({
            role: event.type === 'conversation.item.input_audio_transcription.completed' ? 'user' : 'assistant',
            content: event.transcript || event.item?.content?.[0]?.text
          })).filter(msg => msg.content);

          console.log("Messages to analyze:", messages);

          if (messages.length === 0) {
            console.log("No valid messages to analyze");
            return;
          }

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer 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'  

            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: [
                { 
                  role: "system", 
                  content: "You are analyzing a conversation between a child and an AI tutor working on a maker project. Provide a brief summary of their progress and engagement for the parent. Start your phrase with 'Your child is doing <step the child is on> and here is how you can help them - <your analysis> . Keep it concise and highlight only key learning moments. If there isn't enough information from the chat, say 'There are no major updates yet!' '" 
                },
                ...messages
              ]
            })
          });

          if (!response.ok) {
            throw new Error(`API call failed: ${response.status}`);
          }

          const data = await response.json();
          console.log("API response:", data);
          setAnalysis(data.choices[0].message.content);
        } catch (error) {
          console.error('Error in analysis:', error);
          setAnalysis("Your child is doing great! Will update you again in 2 minutes");
        }
      } else {
        console.log("No chat events to analyze");
        setAnalysis("Waiting for conversation to begin...");
      }
    }, 30000);

    return () => {
      console.log("Cleaning up interval");
      clearInterval(intervalId);
    };
  }, []); // Empty dependency array

  // Also add this useEffect to monitor chatEvents changes
  useEffect(() => {
    console.log("Chat events updated:", chatEvents);
  }, [chatEvents]);

  return (
    <div className="h-screen w-screen flex bg-white p-4">
      {/* Chat Section - make it wider with flex-[3] */}
      <div className="flex-[3] h-full mr-4">
        <div className="w-full h-full bg-white rounded-lg shadow-lg p-6 flex flex-col">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Monitor your Child's Chat:</h1>
          
          <div className="flex-1 overflow-y-auto space-y-4">
            {chatEvents.map((event, index) => {
              // Handle input transcriptions
              if (event.type === 'conversation.item.input_audio_transcription.completed') {
                return (
                  <div key={event.event_id || index} className="flex justify-end">
                    <div className="bg-blue-100 rounded-lg p-3 max-w-[70%]">
                      <p className="text-sm text-gray-600 mb-1">Your Child:</p>
                      <p className="text-gray-800">{event.transcript}</p>
                    </div>
                  </div>
                );
              }
              // Handle output transcriptions
              else if (event.type === 'response.audio_transcript.done') {
                return (
                  <div key={event.event_id || index} className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-3 max-w-[70%]">
                      <p className="text-sm text-gray-600 mb-1">Panda Tutor:</p>
                      <p className="text-gray-800">{event.transcript}</p>
                    </div>
                  </div>
                );
              }
              return null;
            })}
            {/* Add div for scrolling reference */}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Analysis Panel - make it narrower with flex-1 */}
      <div className="flex-1 h-full bg-white rounded-lg shadow-lg p-6 flex flex-col">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Tips to Help Your Child!</h2>
        <div className="bg-gray-50 rounded-lg p-4 flex-1">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {analysis}
          </p>
        </div>
        <div className="mt-4 text-xs text-gray-500">
          Updates every 2 minutes
        </div>
      </div>
    </div>
  );
} 