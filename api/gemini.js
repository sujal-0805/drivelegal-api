export default async function handler(req, res) {

  // Handle CORS preflight
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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_KEY = process.env.GEMINI_API_KEY;

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

    const messages = [];

    if (history && Array.isArray(history)) {
      for (const h of history) {
        if (h.role && h.text) {
          messages.push({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.text }]
          });
        }
      }
    }

    const fullMessage = context
      ? `${context}\n\nUser question: ${message}`
      : message;

    messages.push({
      role: 'user',
      parts: [{ text: fullMessage }]
    });

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: messages,
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.3,
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const errorData = await geminiRes.json();
      console.error('Gemini error:', errorData);
      return res.status(500).json({
        error: 'Gemini API error',
        details: errorData
      });
    }

    const data = await geminiRes.json();
    const answer = data?.candidates?.[0]
      ?.content?.parts?.[0]?.text
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
