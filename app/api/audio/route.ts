import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { AudioProcessingRequest, AudioProcessingResponse } from '@/types/audio';

// Initialize Gemini AI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const { audioData, mimeType }: AudioProcessingRequest = await request.json();

    if (!audioData) {
      return NextResponse.json({
        success: false,
        error: 'Audio data is required'
      } as AudioProcessingResponse, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Gemini API key not configured'
      } as AudioProcessingResponse, { status: 500 });
    }

    // Validate MIME type
    const supportedTypes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mp4', 'audio/ogg'];
    const cleanMimeType = mimeType.split(';')[0]; // Remove codec info
    
    if (!supportedTypes.includes(cleanMimeType)) {
      return NextResponse.json({
        success: false,
        error: `Unsupported audio format: ${cleanMimeType}`
      } as AudioProcessingResponse, { status: 400 });
    }

    // Prepare content for Gemini
    const contents = [
      {
        role: 'user' as const,
        parts: [
          {
            text: `Please transcribe this audio and identify any task management intent. 

If the user is expressing a task-related intent (like creating, updating, or asking about tasks), please also extract that intent.

Respond in this format:
TRANSCRIPTION: [exact words spoken]
INTENT: [task management intent if any, or "none"]
CONFIDENCE: [0-1 confidence score]`
          },
          {
            inlineData: {
              mimeType: cleanMimeType,
              data: audioData
            }
          }
        ]
      }
    ];

    // Call Gemini for audio processing
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents,
      config: {
        temperature: 0.1, // Low temperature for accurate transcription
        maxOutputTokens: 1000
      }
    });

    const responseText = response.text || '';
    
    // Parse the structured response
    const transcriptionMatch = responseText.match(/TRANSCRIPTION:\s*(.+?)(?=\nINTENT:|$)/s);
    const intentMatch = responseText.match(/INTENT:\s*(.+?)(?=\nCONFIDENCE:|$)/s);
    const confidenceMatch = responseText.match(/CONFIDENCE:\s*([0-9.]+)/);

    const transcription = transcriptionMatch?.[1]?.trim() || responseText;
    const intent = intentMatch?.[1]?.trim() || 'none';
    const confidence = confidenceMatch?.[1] ? parseFloat(confidenceMatch[1]) : 0.8;

    return NextResponse.json({
      success: true,
      transcription,
      intent: intent !== 'none' ? intent : undefined,
      confidence
    } as AudioProcessingResponse);

  } catch (error) {
    console.error('Error in audio processing API:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process audio',
      details: errorMessage
    } as AudioProcessingResponse, { status: 500 });
  }
}