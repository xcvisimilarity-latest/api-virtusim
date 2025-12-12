// api/balance.js - Vercel Serverless Function
import fetch from 'node-fetch';

// In-memory cache (for demo, use Redis in production)
const cache = new Map();

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    
    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    // Only allow GET
    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed. Use GET.'
        });
    }
    
    // Get API key from query parameter
    const { apikey } = req.query;
    
    if (!apikey) {
        return res.status(400).json({
            success: false,
            error: 'Missing apikey parameter. Example: /api/balance?apikey=YOUR_KEY'
        });
    }
    
    // Check cache first (30 second TTL)
    const cacheKey = `balance_${apikey}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 30000) {
        console.log('Cache hit for:', cacheKey);
        return res.status(200).json({
            ...cached.data,
            cached: true,
            cached_at: new Date(cached.timestamp).toISOString(),
            gateway: 'virtusim-gateway'
        });
    }
    
    try {
        // Forward request to Virtusim
        const startTime = Date.now();
        
        const virtusimUrl = `https://virtusim.com/api/v2/json.php?api_key=${apikey}&action=balance`;
        
        const response = await fetch(virtusimUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Origin': 'https://virtusim.com',
                'Referer': 'https://virtusim.com/'
            },
            timeout: 10000
        });
        
        const responseTime = Date.now() - startTime;
        
        if (!response.ok) {
            throw new Error(`Virtusim API returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Cache the response
        cache.set(cacheKey, {
            data: data,
            timestamp: Date.now()
        });
        
        // Clean cache if too big
        if (cache.size > 100) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
        }
        
        // Return formatted response
        res.status(200).json({
            success: true,
            ...data,
            gateway: {
                name: 'virtusim-gateway',
                version: '1.0.0',
                response_time: responseTime,
                cached: false
            }
        });
        
    } catch (error) {
        console.error('Proxy error:', error.message);
        
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Failed to fetch from Virtusim API',
            gateway: 'virtusim-gateway'
        });
    }
}
