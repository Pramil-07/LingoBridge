/**
 * Get WebSocket URL based on current environment
 * Note: React proxy doesn't work for WebSocket, so we connect directly to backend
 */
export const getWebSocketURL = (path, token) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  // In development, always connect to localhost:8000 (backend port)
  // In production, use environment variable or same host
  let wsHost;
  if (process.env.NODE_ENV === 'development') {
    // Use environment variable if set, otherwise default to localhost:8000
    wsHost = process.env.REACT_APP_WS_HOST 
      ? process.env.REACT_APP_WS_HOST 
      : `${window.location.hostname}:8000`;
  } else {
    // In production, use the same host or environment variable
    wsHost = process.env.REACT_APP_WS_HOST || window.location.host;
  }
  
  return `${protocol}//${wsHost}${path}?token=${token}`;
};

/**
 * Create WebSocket connection with retry logic
 */
export const createWebSocket = (url, onMessage, onError, onOpen, onClose, maxRetries = 5) => {
  let retryCount = 0;
  let ws = null;
  let reconnectTimeout = null;

  const connect = () => {
    try {
      ws = new WebSocket(url);
      
      ws.onopen = (event) => {
        console.log('WebSocket connected');
        retryCount = 0; // Reset retry count on successful connection
        if (onOpen) onOpen(event);
      };

      ws.onmessage = (event) => {
        if (onMessage) onMessage(event);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (onError) onError(error);
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        
        if (onClose) onClose(event);
        
        // Only retry if it wasn't a normal closure and we haven't exceeded max retries
        if (event.code !== 1000 && retryCount < maxRetries) {
          retryCount++;
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff, max 30s
          console.log(`Attempting to reconnect WebSocket (${retryCount}/${maxRetries}) in ${delay}ms...`);
          
          reconnectTimeout = setTimeout(() => {
            connect();
          }, delay);
        } else if (retryCount >= maxRetries) {
          console.error('WebSocket connection failed after maximum retries');
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      if (onError) onError(error);
    }
  };

  connect();

  return {
    ws: () => ws,
    close: () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close(1000, 'Manual close');
      }
    },
    reconnect: () => {
      retryCount = 0;
      if (ws) {
        ws.close();
      }
      connect();
    }
  };
};

