/**
 * WebSocket Service
 * Handles real-time updates for meeting status, attendance records, and court cards
 */

type WebSocketEvent = 'meeting-started' | 'meeting-ended' | 'participant-joined' | 'participant-left' | 'court-card-updated' | 'attendance-updated';

interface WebSocketMessage {
  event: WebSocketEvent;
  data: any;
}

type EventCallback = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private listeners: Map<WebSocketEvent, Set<EventCallback>> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private token: string | null = null;
  private isConnecting = false;

  constructor() {
    // Determine WebSocket URL based on environment
    const apiUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'https://proofmeet-backend-production.up.railway.app/api';
    // Convert HTTP(S) URL to WS(S)
    this.url = apiUrl.replace(/^https?/, 'wss').replace('/api', '/ws');
  }

  /**
   * Connect to WebSocket server with authentication token
   */
  connect(token: string): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    this.token = token;
    this.isConnecting = true;

    try {
      console.log('Connecting to WebSocket:', this.url);
      
      // Include token in URL query parameter
      const wsUrl = `${this.url}?token=${encodeURIComponent(token)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('📩 WebSocket message:', message);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.isConnecting = false;
        this.ws = null;
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.reconnectAttempts = 0;
    this.isConnecting = false;
    console.log('WebSocket disconnected by user');
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Max reconnect attempts reached. Giving up.');
      return;
    }

    if (!this.token) {
      console.log('No token available for reconnection');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect(this.token!);
    }, delay);
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: WebSocketMessage): void {
    const listeners = this.listeners.get(message.event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(message.data);
        } catch (error) {
          console.error(`Error in listener for event ${message.event}:`, error);
        }
      });
    }
  }

  /**
   * Subscribe to a specific WebSocket event
   */
  on(event: WebSocketEvent, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  /**
   * Unsubscribe from a specific event
   */
  off(event: WebSocketEvent, callback: EventCallback): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Send a message to the WebSocket server
   */
  send(event: WebSocketEvent, data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = { event, data };
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', event, data);
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default websocketService;

