import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { taskFunctions, executeTaskFunction } from '@/lib/gemini-functions';

// Initialize Gemini AI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory, audioMetadata } = await request.json();

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Prepare conversation contents with concise system prompt
    const contents = [
      {
        role: 'user' as const,
        parts: [{
          text: `You are a task management AI assistant. Understand user intent and help accomplish goals.

**Core Capabilities:**
- Create tasks for "I need to", "I should", or similar intent
- Recognize scheduling: "tomorrow", "next week", "at 3pm", etc.
- Handle status: "done", "finished", "working on", "started"
- Track progress: "I made progress", "I'm stuck", "log this", "first I need to"

**Tool Usage Rules:**
1. ALWAYS call get_tasks() first when user asks about tasks or mentions existing tasks
2. Use create_task() for new tasks with actionable titles and descriptions
3. Use start_task(), complete_task(), delete_task() for status changes
4. Use add_task_log() for progress updates and notes
5. Chain functions: get_tasks() → action → add_task_log() when appropriate
6. Parse natural times to ISO format
7. Get task IDs from get_tasks() before using in other functions

**Response Guidelines:**
- Be direct and concise
- Confirm actions taken
- Suggest next steps
- Stay focused on task management

User message: "${message}"${audioMetadata ? `\n\n[Note: This message was transcribed from voice input]` : ''}

Take appropriate actions to help the user.`
        }]
      }
    ];

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      // Add previous messages to context (limit to last 10 for performance)
      const recentHistory = conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        contents.push({
          role: msg.role === 'user' ? 'user' as const : 'model' as const,
          parts: [{ text: msg.content }]
        });
      }

      // Add current message
      contents.push({
        role: 'user' as const,
        parts: [{ text: message }]
      });
    }

    // Configure function calling
    const config = {
      tools: [{
        functionDeclarations: taskFunctions
      }],
      temperature: 0.7,
      maxOutputTokens: 1000
    };

    // Compositional function calling loop - allows chaining multiple function calls
    let allFunctionCalls: any[] = [];
    let allFunctionResults: any[] = [];

    // Loop until the model has no more function calls to make
    while (true) {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents,
        config
      });

      // Check if Gemini wants to call functions
      if (response.functionCalls && response.functionCalls.length > 0) {
        // Store function calls for final response
        allFunctionCalls.push(...response.functionCalls);

        // Execute all function calls in this turn
        const currentTurnResults = [];
        for (const functionCall of response.functionCalls) {
          try {
            const result = await executeTaskFunction(functionCall.name || '', functionCall.args);
            currentTurnResults.push({
              name: functionCall.name || '',
              result: result
            });
          } catch (error) {
            console.error(`Error executing function ${functionCall.name}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            currentTurnResults.push({
              name: functionCall.name || '',
              result: { success: false, error: errorMessage }
            });
          }
        }

        // Store results for final response
        allFunctionResults.push(...currentTurnResults);

        // Add the model's function calls to conversation
        contents.push({
          role: 'model' as const,
          parts: response.functionCalls.map(fc => ({ functionCall: fc }))
        });

        // Add function results to conversation
        contents.push({
          role: 'user' as const,
          parts: currentTurnResults.map(result => ({
            functionResponse: {
              name: result.name,
              response: { result: result.result }
            }
          }))
        });

        // Continue the loop to see if model wants to make more function calls
        continue;
      } else {
        // No more function calls, get final response
        let finalResponse = response.text || 'Task operation completed successfully.';

        // If we executed functions, enhance the response
        if (allFunctionCalls.length > 0) {
          const enhancedResponsePrompt = {
            role: 'user' as const,
            parts: [{
              text: `Based on the function calls and results above, provide a natural, helpful response. Include:
              1. Confirmation of what was accomplished
              2. Relevant details from the results
              3. Proactive suggestions for next steps or related actions
              4. Encouraging tone that keeps the user motivated
              
              Make it conversational and human-like, not robotic. If there were any errors, explain them clearly and suggest solutions.`
            }]
          };

          const enhancedResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: [...contents, enhancedResponsePrompt],
            config: {
              temperature: 0.7,
              maxOutputTokens: 1000
            }
          });

          finalResponse = enhancedResponse.text || finalResponse;
        }

        return NextResponse.json({
          success: true,
          response: finalResponse,
          functionCalls: allFunctionCalls,
          functionResults: allFunctionResults
        });
      }
    }

  } catch (error) {
    console.error('Error in chat API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process chat request',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
