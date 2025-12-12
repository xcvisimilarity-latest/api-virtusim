// api/balance.js - Fixed for Vercel
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Only GET allowed
    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed. Use GET.'
        });
    }
    
    // Get API key
    const { apikey } = req.query;
    
    if (!apikey) {
        return res.status(400).json({
            success: false,
            error: 'Missing apikey parameter',
            example: 'https://your-domain.vercel.app/api/balance?apikey=YOUR_KEY'
        });
    }
    
    console.log(`🔍 Request for API key: ${apikey.substring(0, 8)}...`);
    
    try {
        // Build Virtusim URL
        const virtusimUrl = `https://virtusim.com/api/v2/json.php?api_key=${apikey}&action=balance`;
        console.log(`📡 Forwarding to: ${virtusimUrl.substring(0, 80)}...`);
        
        const startTime = Date.now();
        
        // Vercel has built-in fetch, no need for node-fetch
        const response = await fetch(virtusimUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Origin': 'https://virtusim.com',
                'Referer': 'https://virtusim.com/'
            }
        });
        
        const responseTime = Date.now() - startTime;
        
        console.log(`📊 Response status: ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`Virtusim returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`✅ Success: ${JSON.stringify(data).substring(0, 100)}...`);
        
        // Return formatted response
        return res.status(200).json({
            success: true,
            ...data,
            gateway: {
                name: 'virtusim-gateway',
                version: '1.0.0',
                response_time: responseTime,
                server: 'Vercel Edge',
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ Proxy error:', error.message);
        
        return res.status(500).json({
            success: false,
            error: error.message,
            details: 'Failed to fetch from Virtusim API',
            gateway: 'virtusim-gateway',
            timestamp: new Date().toISOString()
        });
    }
}
