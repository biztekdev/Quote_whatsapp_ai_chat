import pkg from 'node-wit';
const { Wit, log } = pkg;

class WitService {
    constructor() {
        this.accessToken = process.env.WIT_AI_ACCESS_TOKEN;
        this.client = null;
        this.actions = {}; // Initialize actions object
        
        this.initializeClient();
    }

    initializeClient() {
        console.log('Environment variables check:');
        console.log('WIT_AI_ACCESS_TOKEN:', process.env.WIT_AI_ACCESS_TOKEN ? 'Present' : 'Missing');
        console.log('WHATSAPP_ACCESS_TOKEN:', process.env.WHATSAPP_ACCESS_TOKEN ? 'Present' : 'Missing');
        
        if (!this.accessToken) {
            console.warn('Wit.ai access token not found. WitService will run in mock mode.');
            return;
        }

        try {
            this.client = new Wit({accessToken: this.accessToken});
            console.log('Wit.ai client initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Wit.ai client:', error.message);
            this.client = null;
        }
    }

    /**
     * Professional function to process messages through Wit.ai
     * @param {string} message - The message to process
     * @param {Object} options - Additional options for processing
     * @returns {Promise<Object>} - Wit.ai response or mock response
     */
    async processMessage(message, options = {}) {
        try {
            console.log(`Token for Wit.ai: ${this.accessToken}`);
            // if (!this.client) {
            //     console.log('Wit.ai client not initialized');
                
            //     return this.getMockResponse(message);
            // }

            if (!message || typeof message !== 'string') {
                throw new Error('Invalid message: message must be a non-empty string');
            }

            console.log(`Processing message through Wit.ai: "${message}"`);
            console.log(`Token for Wit.ai: "${this.accessToken}"`);

            const response = await this.client.message(message, options);
            
            console.log('Wit.ai response:', JSON.stringify(response, null, 2));
            
            return {
                success: true,
                data: response,
                timestamp: new Date().toISOString(),
                message: 'Message processed successfully'
            };

        } catch (error) {
            console.error('Error processing message with Wit.ai:', error);
            
            return {
                success: false,
                error: error.message,
                data: this.getMockResponse(message),
                timestamp: new Date().toISOString(),
                message: 'Fallback to mock response due to error'
            };
        }
    }

    /**
     * Extract entities and their values from Wit.ai response
     * @param {Object} witResponse - The response from Wit.ai
     * @returns {Array} - Array of entities in format [{"entity": "category", "value": "Mylar bag"}, ...]
     */
    extractEntities(witResponse) {
        try {
            const entitiesArray = [];
            
            if (!witResponse || !witResponse.entities) {
                return entitiesArray;
            }

            // Extract all entities from the response
            Object.keys(witResponse.entities).forEach(entityKey => {
                const entityArray = witResponse.entities[entityKey];
                
                if (Array.isArray(entityArray) && entityArray.length > 0) {
                    // Get the first (most confident) entity value
                    const entity = entityArray[0];
                    
                    entitiesArray.push({
                        entity: entityKey,
                        value: entity.value,
                        confidence: entity.confidence || 0,
                        type: entity.type || 'unknown',
                        body: entity.body || entity.value,
                        start: entity.start || 0,
                        end: entity.end || 0
                    });
                }
            });

            return entitiesArray;

        } catch (error) {
            console.error('Error extracting entities:', error);
            return [];
        }
    }

    

    /**
     * Extract and parse dimensions from entities array
     * @param {Array} entitiesArray - entities Array
     * @returns {Array} - Array of dimensions in format [{"name":"L","value":5},{"name":"W","value":3},{"name":"H","value":7}]
     */
    getDimensionsFromEntities(entitiesArray) {
        try {
            const category = entitiesArray.filter(entity => entity.entity === 'category:category');
            if(category.length === 0) {
                console.log('No category found in entities');
                return [];
            }

            const categoryName = category[0].value;
            const dimensionNames = this.getDimensionNamesFromCategory(categoryName);
            console.log(`dimensionNames:`, dimensionNames);
            console.log(`Category:`, categoryName);

            const dimensions = entitiesArray.filter(entity => entity.entity === 'dimensions:dimensions');
            if(dimensions.length === 0) {
                console.log('No dimensions found in entities');
                return [];
            }

            const dimensionValue = dimensions[0].value;
            console.log(`Dimension:`, dimensionValue);

            // Parse the dimension value and map to dimension names
            const parsedDimensions = this.parseDimensions(dimensionValue, dimensionNames);
            console.log(`Parsed Dimensions:`, parsedDimensions);

            return parsedDimensions;

        } catch (error) {
            console.error('Error parsing dimensions:', error);
            return [];
        }
    }

    /**
     * Parse dimension string and map to dimension names
     * @param {string} dimensionString - The dimension string (e.g., "5x7x3", "5,7,3", "l:5,w:3,h:7")
     * @param {Array} dimensionNames - Array of dimension names (e.g., ["L", "W", "H"])
     * @returns {Array} - Array of parsed dimensions [{"name":"L","value":5},{"name":"W","value":3},{"name":"H","value":7}]
     */
    parseDimensions(dimensionString, dimensionNames) {
        try {
            if (!dimensionString || !dimensionNames || dimensionNames.length === 0) {
                return [];
            }

            let values = [];
            const dimensionStringLower = dimensionString.toLowerCase().trim();

            // Handle format: "l:5,w:3,h:7" or "L:5,W:3,H:7"
            if (dimensionStringLower.includes(':')) {
                const pairs = dimensionStringLower.split(',');
                const dimensionMap = {};
                
                pairs.forEach(pair => {
                    const [key, value] = pair.split(':').map(s => s.trim());
                    if (key && value) {
                        dimensionMap[key.toLowerCase()] = parseFloat(value);
                    }
                });

                // Map to dimension names in order
                return dimensionNames.map(name => ({
                    name: name,
                    value: dimensionMap[name.toLowerCase()] || 0
                }));
            }

            // Handle format: "5x7x3" or "5,7,3"
            if (dimensionStringLower.includes('x')) {
                values = dimensionStringLower.split('x').map(v => parseFloat(v.trim()));
            } else if (dimensionStringLower.includes(',')) {
                values = dimensionStringLower.split(',').map(v => parseFloat(v.trim()));
            } else {
                // Try to extract numbers from string
                const numbers = dimensionStringLower.match(/\d+(?:\.\d+)?/g);
                if (numbers) {
                    values = numbers.map(n => parseFloat(n));
                }
            }

            // Map values to dimension names
            const result = [];
            for (let i = 0; i < dimensionNames.length; i++) {
                result.push({
                    name: dimensionNames[i],
                    value: values[i] || 0
                });
            }

            return result;

        } catch (error) {
            console.error('Error parsing dimension string:', error);
            return [];
        }
    }
    

    /**
     * Get Dimention Names from Category
     * @param {Object} categoryName - The name of the category
     * @returns {Array} - Array of dimention names
     */
    getDimensionNamesFromCategory(categoryName) {
            return ["L","W","H"];
    }

    /**
     * Extract and organize required data from entities array
     * @param {Array} entitiesArray - Array of entities from Wit.ai
     * @returns {Object} - Organized data object with all required information
     */
    getRequiredDataFromEntities(entitiesArray) {
        try {
            const data = {
                category: null,
                quantity: null,
                dimensions: [],
                otherEntities: []
            };

            if (!entitiesArray || !Array.isArray(entitiesArray)) {
                return data;
            }

            // Process each entity
            entitiesArray.forEach(entity => {
                switch (entity.entity) {
                    case 'category:category':
                        data.category = {
                            name: entity.value,
                            confidence: entity.confidence || 0
                        };
                        break;
                    
                    case 'quantity:quantity':
                        data.quantity = {
                            value: parseFloat(entity.value) || 0,
                            unit: this.extractQuantityUnit(entity.value),
                            confidence: entity.confidence || 0
                        };
                        break;
                    
                    case 'dimensions:dimensions':
                        // Parse dimensions and get dimension names based on category
                        const categoryName = data.category ? data.category.name : 'default';
                        const dimensionNames = this.getDimensionNamesFromCategory(categoryName);
                        data.dimensions = this.parseDimensions(entity.value, dimensionNames);
                        break;
                    
                    default:
                        // Store other entities
                        data.otherEntities.push({
                            entity: entity.entity,
                            value: entity.value,
                            confidence: entity.confidence || 0
                        });
                        break;
                }
            });

            return data;

        } catch (error) {
            console.error('Error extracting required data from entities:', error);
            return {
                category: null,
                quantity: null,
                dimensions: [],
                otherEntities: []
            };
        }
    }

    /**
     * Extract unit from quantity string
     * @param {string} quantityString - The quantity string (e.g., "300 pieces", "5 kg")
     * @returns {string} - The unit extracted from the string
     */
    extractQuantityUnit(quantityString) {
        try {
            if (!quantityString) return '';
            
            // Common units to look for
            const units = ['pieces', 'pcs', 'kg', 'grams', 'lbs', 'meters', 'cm', 'mm', 'liters', 'ml'];
            const lowerString = quantityString.toLowerCase();
            
            for (const unit of units) {
                if (lowerString.includes(unit)) {
                    return unit;
                }
            }
            
            return '';
        } catch (error) {
            console.error('Error extracting quantity unit:', error);
            return '';
        }
    }

    /**
     * Get mock response when Wit.ai is not available
     * @param {string} message - The message to analyze
     * @returns {Object} - Mock response
     */
    getMockResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        // Simple keyword-based intent detection
        let intent = 'unknown';
        let confidence = 0.5;
        let entities = {};

        if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
            intent = 'greeting';
            confidence = 0.8;
        } else if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
            intent = 'help';
            confidence = 0.7;
        } else if (lowerMessage.includes('quote') || lowerMessage.includes('price') || lowerMessage.includes('cost')) {
            intent = 'quote_request';
            confidence = 0.7;
            // Add sample entities for quote requests
            if (lowerMessage.includes('mylar')) {
                entities['category:category'] = [{ value: 'Mylar bag', confidence: 0.8 }];
            }
            if (lowerMessage.includes('300') || lowerMessage.includes('three hundred')) {
                entities['quantity:quantity'] = [{ value: '300', confidence: 0.9 }];
            }
            // Add sample dimensions for testing
            if (lowerMessage.includes('5x7x3') || lowerMessage.includes('5,7,3') || lowerMessage.includes('l:5,w:7,h:3')) {
                entities['dimensions:dimensions'] = [{ value: lowerMessage.includes('5x7x3') ? '5x7x3' : lowerMessage.includes('5,7,3') ? '5,7,3' : 'l:5,w:7,h:3', confidence: 0.9 }];
            }
        } else if (lowerMessage.includes('contact') || lowerMessage.includes('phone') || lowerMessage.includes('email')) {
            intent = 'contact_info';
            confidence = 0.6;
        } else if (lowerMessage.includes('product') || lowerMessage.includes('item')) {
            intent = 'product_inquiry';
            confidence = 0.6;
        }

        return {
            text: message,
            intents: [{ id: `${intent}_${Date.now()}`, name: intent, confidence }],
            entities: entities,
            traits: {},
            _text: message
        };
    }

    /**
     * Get client status
     * @returns {Object} - Client status information
     */
    getStatus() {
        return {
            initialized: !!this.client,
            hasAccessToken: !!this.accessToken,
            actions: this.actions ? Object.keys(this.actions) : [],
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Test the Wit.ai connection
     * @returns {Promise<Object>} - Test result
     */
    async testConnection() {
        try {
            if (!this.client) {
                return {
                    success: false,
                    message: 'Wit.ai client not initialized - check access token',
                    status: this.getStatus()
                };
            }

            const testMessage = 'Hello, this is a test message';
            const response = await this.processMessage(testMessage);
            
            return {
                success: true,
                message: 'Wit.ai connection test successful',
                testResponse: response,
                status: this.getStatus()
            };
        } catch (error) {
            return {
                success: false,
                message: 'Wit.ai connection test failed',
                error: error.message,
                status: this.getStatus()
            };
        }
    }
}

export default WitService;