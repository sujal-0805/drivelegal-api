export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'DriveLegal API is running' 
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed' 
    });
  }

  const API_KEY = process.env.GROQ_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ 
      error: 'API key not configured' 
    });
  }

  try {
    const { message, context, history, language } = req.body;

    if (!message) {
      return res.status(400).json({ 
        error: 'Message is required' 
      });
    }

    // Build messages for Groq
    const messages = [];

    // System message with context
    if (context) {
      messages.push({
        role: 'system',
        content: context
      });
    }

    // Add history
    if (history && Array.isArray(history)) {
      for (const h of history) {
        if (h.role && h.text) {
          messages.push({
            role: h.role === 'user' ? 'user' : 'assistant',
            content: h.text
          });
        }
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message
    });

    // Call Groq API
    const groqRes = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: messages,
          max_tokens: 300,
          temperature: 0.3,
        })
      }
    );

    if (!groqRes.ok) {
      const errorData = await groqRes.json();
      console.error('Groq error:', errorData);
      return res.status(500).json({
        error: 'AI API error',
        details: errorData
      });
    }

    const data = await groqRes.json();
    const answer = data?.choices?.[0]
      ?.message?.content
      ?? 'I could not find information on that.';

    return res.status(200).json({ answer });

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
}
