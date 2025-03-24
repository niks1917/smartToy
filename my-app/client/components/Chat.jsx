import React from 'react';

export default function Chat({ events }) {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-4xl h-[80vh] bg-white rounded-lg shadow-lg p-6 flex flex-col">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Conversation History</h1>
        
        <div className="flex-1 overflow-y-auto space-y-4">
          {events.map((event, index) => {
            // Handle input transcriptions
            if (event.type === 'conversation.item.input_audio_transcription.completed') {
              return (
                <div key={index} className="flex justify-end">
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
                <div key={index} className="flex justify-start">
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
                <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
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