/**
 * CometBFT WebSocket Client for Atlas Chain
 * Connects to CometBFT WebSocket endpoint for real-time blockchain events
 */

export type CometBFTEvent = "NewBlock" | "NewBlockHeader" | "Tx" | "ValidatorSetUpdates";

export interface WebSocketMessage {
    jsonrpc: "2.0";
    method?: string;
    params?: {
        query: string;
    };
    result?: any;
    id: number;
}

export interface BlockEvent {
    type: string;
    value: {
        block: any;
        result_begin_block: any;
        result_end_block: any;
    };
}

export class CometBFTWebSocket {
    private ws: WebSocket | null = null;
    private url: string;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private subscriptionId = 1;
    private eventHandlers: Map<CometBFTEvent, Set<(data: any) => void>> = new Map();

    constructor(isMainnet: boolean = false) {
        // Use local network - browser will connect from client side
        const port = isMainnet ? 26667 : 26657;
        this.url = `ws://localhost:${port}/websocket`;

        // Initialize event handler sets
        this.eventHandlers.set("NewBlock", new Set());
        this.eventHandlers.set("NewBlockHeader", new Set());
        this.eventHandlers.set("Tx", new Set());
        this.eventHandlers.set("ValidatorSetUpdates", new Set());
    }

    /**
     * Connect to CometBFT WebSocket
     */
    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.url);

                this.ws.onopen = () => {
                    console.log("Connected to CometBFT WebSocket");
                    this.reconnectAttempts = 0;
                    resolve();
                };

                this.ws.onerror = (error) => {
                    console.error("WebSocket error:", error);
                    reject(error);
                };

                this.ws.onclose = () => {
                    console.log("WebSocket connection closed");
                    this.attemptReconnect();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const message: WebSocketMessage = JSON.parse(event.data);
                        this.handleMessage(message);
                    } catch (error) {
                        console.error("Error parsing WebSocket message:", error);
                    }
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Subscribe to a specific event type
     */
    subscribe(eventType: CometBFTEvent): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error("WebSocket not connected");
            return;
        }

        const query = `tm.event='${eventType}'`;
        const message: WebSocketMessage = {
            jsonrpc: "2.0",
            method: "subscribe",
            params: { query },
            id: this.subscriptionId++,
        };

        this.ws.send(JSON.stringify(message));
        console.log(`Subscribed to ${eventType}`);
    }

    /**
     * Unsubscribe from a specific event type
     */
    unsubscribe(eventType: CometBFTEvent): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error("WebSocket not connected");
            return;
        }

        const query = `tm.event='${eventType}'`;
        const message: WebSocketMessage = {
            jsonrpc: "2.0",
            method: "unsubscribe",
            params: { query },
            id: this.subscriptionId++,
        };

        this.ws.send(JSON.stringify(message));
        console.log(`Unsubscribed from ${eventType}`);
    }

    /**
     * Unsubscribe from all events
     */
    unsubscribeAll(): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error("WebSocket not connected");
            return;
        }

        const message: WebSocketMessage = {
            jsonrpc: "2.0",
            method: "unsubscribe_all",
            params: { query: "" },
            id: this.subscriptionId++,
        };

        this.ws.send(JSON.stringify(message));
        console.log("Unsubscribed from all events");
    }

    /**
     * Register an event handler for a specific event type
     */
    on(eventType: CometBFTEvent, handler: (data: any) => void): void {
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
            handlers.add(handler);
        }
    }

    /**
     * Remove an event handler
     */
    off(eventType: CometBFTEvent, handler: (data: any) => void): void {
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
            handlers.delete(handler);
        }
    }

    /**
     * Handle incoming WebSocket messages
     */
    private handleMessage(message: WebSocketMessage): void {
        if (message.result && message.result.data) {
            const eventData = message.result.data;
            const eventType = eventData.type;

            // Map CometBFT event types to our event types
            let mappedEventType: CometBFTEvent | null = null;
            if (eventType && eventType.includes("NewBlock")) {
                mappedEventType = "NewBlock";
            } else if (eventType && eventType.includes("NewBlockHeader")) {
                mappedEventType = "NewBlockHeader";
            } else if (eventType && eventType.includes("Tx")) {
                mappedEventType = "Tx";
            } else if (eventType && eventType.includes("ValidatorSetUpdates")) {
                mappedEventType = "ValidatorSetUpdates";
            }

            if (mappedEventType) {
                const handlers = this.eventHandlers.get(mappedEventType);
                if (handlers) {
                    handlers.forEach(handler => {
                        try {
                            handler(eventData.value);
                        } catch (error) {
                            console.error(`Error in event handler for ${mappedEventType}:`, error);
                        }
                    });
                }
            }
        }
    }

    /**
     * Attempt to reconnect if connection is lost
     */
    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error("Max reconnection attempts reached");
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;

        console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
            this.connect().catch(error => {
                console.error("Reconnection failed:", error);
            });
        }, delay);
    }

    /**
     * Close the WebSocket connection
     */
    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Check if WebSocket is connected
     */
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}

// Example usage:
// const ws = new CometBFTWebSocket(false); // testnet
// await ws.connect();
// ws.on("NewBlock", (block) => {
//     console.log("New block:", block);
// });
// ws.subscribe("NewBlock");
