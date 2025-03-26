import React, { useState, useEffect } from 'react';

// Helper function to safely access localStorage
const getLocalStorage = () => {
  if (typeof window !== 'undefined') {
    return window.localStorage;
  }
  return null;
};

export default function Chat({ events }) {
  const [chatEvents, setChatEvents] = useState(() => {
    const storage = getLocalStorage();
    if (storage) {
      const savedEvents = storage.getItem('chatEvents');
      return savedEvents ? JSON.parse(savedEvents) : [];
    }
    return [];
  });

  // Update chat events when new events come in
  useEffect(() => {
    if (events && events.length > 0) {
      // Get the latest event (first in the array since we prepend new events)
      const latestEvent = events[0];
      
      // Check if this is a chat-relevant event
      const isChatEvent = 
        latestEvent.type === 'conversation.item.input_audio_transcription.completed' ||
        latestEvent.type === 'response.audio_transcript.done' ||
        (latestEvent.type === 'conversation.item.create' && latestEvent.item?.content?.[0]?.text);

      if (isChatEvent) {
        setChatEvents(prev => {
          // Check if this event is already in the list
          const isDuplicate = prev.some(event => 
            event.event_id === latestEvent.event_id || 
            (event.type === latestEvent.type && 
             event.timestamp === latestEvent.timestamp)
          );

          if (isDuplicate) {
            return prev;
          }

          // Add the new event to the beginning of the list
          const updatedEvents = [latestEvent, ...prev];
          const storage = getLocalStorage();
          if (storage) {
            storage.setItem('chatEvents', JSON.stringify(updatedEvents));
          }
          return updatedEvents;
        });
      }
    }
  }, [events]);

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

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-4xl h-[80vh] bg-white rounded-lg shadow-lg p-6 flex flex-col">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Conversation History</h1>
        
        <div className="flex-1 overflow-y-auto space-y-4">
          {chatEvents.map((event, index) => {
            // Handle input transcriptions
            if (event.type === 'conversation.item.input_audio_transcription.completed') {
              return (
                <div key={event.event_id || index} className="flex justify-end">
                  <div className="bg-blue-100 rounded-lg p-3 max-w-[70%]">
                    <p className="text-sm text-gray-600 mb-1">You said:</p>
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
                    <p className="text-sm text-gray-600 mb-1">Assistant said:</p>
                    <p className="text-gray-800">{event.transcript}</p>
                  </div>
                </div>
              );
            }
            // Handle text messages
            else if (event.type === 'conversation.item.create' && event.item?.content?.[0]?.text) {
              const isUser = event.item.role === 'user';
              return (
                <div key={event.event_id || index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`rounded-lg p-3 max-w-[70%] ${isUser ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <p className="text-sm text-gray-600 mb-1">{isUser ? 'You said:' : 'Assistant said:'}</p>
                    <p className="text-gray-800">{event.item.content[0].text}</p>
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
} 