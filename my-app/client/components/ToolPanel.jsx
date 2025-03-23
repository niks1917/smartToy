import { useEffect, useState } from "react";

// const functionDescription = `
// Call this function when a user asks for a color palette.
// `;

const sessionUpdate = {
  type: "session.update",
  session: {
    tools: [],
    tool_choice: "auto",
  },
};

// function FunctionCallOutput({ functionCallOutput }) {
//   // const { theme, colors } = JSON.parse(functionCallOutput.arguments);

//   // const colorBoxes = colors.map((color) => (
//   //   <div
//   //     key={color}
//   //     className="w-full h-16 rounded-md flex items-center justify-center border border-gray-200"
//   //     style={{ backgroundColor: color }}
//   //   >
//   //     <p className="text-sm font-bold text-black bg-slate-100 rounded-md p-2 border border-black">
//   //       {color}
//   //     </p>
//   //   </div>
//   // ));

//   return (
//     <div className="flex flex-col gap-2">
//       <p>Theme: {theme}</p>
//       {colorBoxes}
//       <pre className="text-xs bg-gray-100 rounded-md p-2 overflow-x-auto">
//         {JSON.stringify(functionCallOutput, null, 2)}
//       </pre>
//     </div>
//   );
// }

export default function ToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
}) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [functionCallOutput, setFunctionCallOutput] = useState(null);

  useEffect(() => {
    if (!events || events.length === 0) return;

    const firstEvent = events[events.length - 1];
    if (!functionAdded && firstEvent.type === "session.created") {
      sendClientEvent(sessionUpdate);
      setFunctionAdded(true);
    }

    const mostRecentEvent = events[0];
    if (
      mostRecentEvent.type === "response.done" &&
      mostRecentEvent.response.output
    ) {
      mostRecentEvent.response.output.forEach((output) => {
        if (
          output.type === "function_call" &&
          output.name === "display_color_palette"
        ) {
          setFunctionCallOutput(output);
        }
      });
    }
  }, [events]);

  useEffect(() => {
    if (!isSessionActive) {
      setFunctionAdded(false);
      setFunctionCallOutput(null);
    }
  }, [isSessionActive]);

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gray-50 rounded-md p-4">
        <h2 className="text-lg font-bold">Socratic Tutor</h2>
        {isSessionActive ? (
          functionCallOutput ? (
            <FunctionCallOutput functionCallOutput={functionCallOutput} />
          ) : (
            <p>Let's get started with breadboarding</p>
          )
        ) : (
          <p>Start the session to begin building...</p>
        )}
      </div>
    </section>
  );
}
