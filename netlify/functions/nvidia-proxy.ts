import type { Handler, HandlerEvent } from '@netlify/functions';

const handler: Handler = async (event: HandlerEvent) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Get NVIDIA API key from environment variables
  const NVIDIA_API_KEY = process.env.VITE_NVIDIA_API_KEY;
  
  if (!NVIDIA_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'NVIDIA API key not configured' }),
    };
  }

  try {
    // Parse the request body
    const body = event.body ? JSON.parse(event.body) : {};

    // Make request to NVIDIA API
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // Return the response from NVIDIA API
    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Error proxying to NVIDIA API:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
        },
      }),
    };
  }
};

export { handler };
