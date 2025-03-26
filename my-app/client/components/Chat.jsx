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
            return null;
          })}
        </div>
      </div>
    </div>
  );
} 