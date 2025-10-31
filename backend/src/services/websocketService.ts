/**
 * WebSocket Service for Real-Time Updates
 * Broadcasts meeting status changes, attendance updates, and court card changes
 */

import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  userType?: string;
  courtRepId?: string;
  isAlive?: boolean;
}

interface WebSocketMessage {
  event: string;
  data: any;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket server
   */
  initialize(server: Server): void {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
    });

    logger.info('🔌 WebSocket server initialized on /ws');

    this.wss.on('connection', async (ws: AuthenticatedWebSocket, req) => {
      try {
        // Extract token from query parameters
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const token = url.searchParams.get('token');

        if (!token) {
          logger.warn('WebSocket connection rejected: No token provided');
          ws.close(1008, 'Authentication required');
          return;
        }

        // Verify JWT token
        const secret = process.env.JWT_SECRET!;
        const decoded = jwt.verify(token, secret) as any;

        // Store user info on socket
        ws.userId = decoded.userId;
        ws.userType = decoded.userType;
        ws.courtRepId = decoded.courtRepId;
        ws.isAlive = true;

        // Add to clients map
        if (!this.clients.has(ws.userId)) {
          this.clients.set(ws.userId, new Set());
        }
        this.clients.get(ws.userId)!.add(ws);

        logger.info(`✅ WebSocket client connected: ${ws.userId} (${ws.userType})`);

        // Send welcome message
        this.sendToSocket(ws, 'connected', {
          message: 'Connected to ProofMeet WebSocket',
          userId: ws.userId,
          userType: ws.userType,
        });

        // Handle pong responses for heartbeat
        ws.on('pong', () => {
          ws.isAlive = true;
        });

        // Handle messages from client
        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleClientMessage(ws, message);
          } catch (error) {
            logger.error('Failed to parse WebSocket message:', error);
          }
        });

        // Handle client disconnect
        ws.on('close', () => {
          logger.info(`🔌 WebSocket client disconnected: ${ws.userId}`);
          this.removeClient(ws);
        });

        ws.on('error', (error) => {
          logger.error('WebSocket error:', error);
          this.removeClient(ws);
        });
      } catch (error) {
        logger.error('WebSocket authentication failed:', error);
        ws.close(1008, 'Authentication failed');
      }
    });

    // Start heartbeat to detect dead connections
    this.startHeartbeat();

    logger.info('✅ WebSocket service started');
  }

  /**
   * Start heartbeat to keep connections alive and detect dead ones
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (!this.wss) return;

      this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
        if (ws.isAlive === false) {
          logger.warn(`Terminating dead WebSocket connection: ${ws.userId}`);
          this.removeClient(ws);
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Handle messages from clients
   */
  private handleClientMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage): void {
    logger.info(`📩 WebSocket message from ${ws.userId}:`, message);

    // Handle different message types
    switch (message.event) {
      case 'ping':
        this.sendToSocket(ws, 'pong', { timestamp: Date.now() });
        break;
      case 'subscribe':
        // Handle subscription to specific events
        logger.info(`User ${ws.userId} subscribed to: ${message.data.events}`);
        break;
      default:
        logger.warn(`Unknown WebSocket event: ${message.event}`);
    }
  }

  /**
   * Remove client from tracking
   */
  private removeClient(ws: AuthenticatedWebSocket): void {
    if (ws.userId) {
      const userClients = this.clients.get(ws.userId);
      if (userClients) {
        userClients.delete(ws);
        if (userClients.size === 0) {
          this.clients.delete(ws.userId);
        }
      }
    }
  }

  /**
   * Send message to a specific socket
   */
  private sendToSocket(ws: WebSocket, event: string, data: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = { event, data };
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast to a specific user (all their connections)
   */
  broadcastToUser(userId: string, event: string, data: any): void {
    const userClients = this.clients.get(userId);
    if (userClients) {
      const message: WebSocketMessage = { event, data };
      const messageStr = JSON.stringify(message);
      
      userClients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      });

      logger.info(`📤 Broadcast to user ${userId}: ${event}`);
    }
  }

  /**
   * Broadcast to all connected participants of a specific court rep
   */
  broadcastToCourtRep(courtRepId: string, event: string, data: any): void {
    const message: WebSocketMessage = { event, data };
    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    this.clients.forEach((sockets, userId) => {
      sockets.forEach(ws => {
        if (ws.courtRepId === courtRepId && ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
          sentCount++;
        }
      });
    });

    if (sentCount > 0) {
      logger.info(`📤 Broadcast to court rep ${courtRepId} clients (${sentCount}): ${event}`);
    }
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastToAll(event: string, data: any): void {
    if (!this.wss) return;

    const message: WebSocketMessage = { event, data };
    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    this.wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
        sentCount++;
      }
    });

    logger.info(`📤 Broadcast to all clients (${sentCount}): ${event}`);
  }

  /**
   * Notify when a meeting starts
   */
  notifyMeetingStarted(meetingId: string, participantId: string, meetingData: any): void {
    this.broadcastToUser(participantId, 'meeting-started', {
      meetingId,
      ...meetingData,
    });

    // Also notify the court rep
    if (meetingData.courtRepId) {
      this.broadcastToUser(meetingData.courtRepId, 'meeting-started', {
        meetingId,
        participantId,
        ...meetingData,
      });
    }
  }

  /**
   * Notify when a meeting ends
   */
  notifyMeetingEnded(meetingId: string, participantId: string, attendanceData: any): void {
    this.broadcastToUser(participantId, 'meeting-ended', {
      meetingId,
      ...attendanceData,
    });

    // Also notify the court rep
    if (attendanceData.courtRepId) {
      this.broadcastToUser(attendanceData.courtRepId, 'meeting-ended', {
        meetingId,
        participantId,
        ...attendanceData,
      });
    }
  }

  /**
   * Notify when a participant joins a meeting
   */
  notifyParticipantJoined(meetingId: string, participantId: string, courtRepId: string): void {
    this.broadcastToUser(courtRepId, 'participant-joined', {
      meetingId,
      participantId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify when a participant leaves a meeting
   */
  notifyParticipantLeft(meetingId: string, participantId: string, courtRepId: string, duration: number): void {
    this.broadcastToUser(courtRepId, 'participant-left', {
      meetingId,
      participantId,
      duration,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify when attendance is updated
   */
  notifyAttendanceUpdated(participantId: string, courtRepId: string, attendanceData: any): void {
    // Notify participant
    this.broadcastToUser(participantId, 'attendance-updated', attendanceData);

    // Notify court rep
    this.broadcastToUser(courtRepId, 'attendance-updated', {
      participantId,
      ...attendanceData,
    });
  }

  /**
   * Notify when a court card is updated
   */
  notifyCourtCardUpdated(participantId: string, courtRepId: string, courtCardData: any): void {
    // Notify participant
    this.broadcastToUser(participantId, 'court-card-updated', courtCardData);

    // Notify court rep
    this.broadcastToUser(courtRepId, 'court-card-updated', {
      participantId,
      ...courtCardData,
    });
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown(): void {
    logger.info('Shutting down WebSocket service...');
    
    this.stopHeartbeat();

    if (this.wss) {
      this.wss.clients.forEach(ws => {
        ws.close(1001, 'Server shutting down');
      });
      this.wss.close();
      this.wss = null;
    }

    this.clients.clear();
    logger.info('✅ WebSocket service shutdown complete');
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: this.wss?.clients.size || 0,
      uniqueUsers: this.clients.size,
      clientsPerUser: Array.from(this.clients.entries()).map(([userId, sockets]) => ({
        userId,
        connections: sockets.size,
      })),
    };
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default websocketService;

