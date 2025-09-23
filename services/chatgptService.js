import OpenAI from 'openai';
import mongoLogger from './mongoLogger.js';

class ChatGPTService {
  constructor() {
    this.client = null;
    this.isEnabled = null;
    this.initialized = false;
  }

  _initialize() {
    if (this.initialized) return;
    
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('OpenAI API key is missing or using placeholder value');
      mongoLogger.error('OpenAI API key is missing or using placeholder value');
      this.client = null;
      this.isEnabled = false;
    } else {
      this.client = new OpenAI({
        apiKey: apiKey,
      });
      this.isEnabled = true;
      console.log('✅ ChatGPT service initialized successfully');
      mongoLogger.info('ChatGPT service initialized successfully');
    }
    
    this.initialized = true;
  }

  _checkEnabled() {
    this._initialize();
    
    if (!this.isEnabled) {
      throw new Error('ChatGPT service is not enabled. Please set a valid OPENAI_API_KEY in your environment variables.');
    }
  }

  /**
   * Process a message for entity extraction (similar to Wit.ai processMessage)
   * @param {string} message - The user's message
   * @returns {Object} Similar to Wit.ai response format for compatibility
   */
  async processMessage(message) {
    this._checkEnabled();
    
    try {
      console.log('🤖 Processing message with ChatGPT:', message);
      
      const extractedData = await this.extractEntities(message);
      
      if (!extractedData.success) {
        throw new Error(extractedData.error);
      }

      // Convert ChatGPT response to Wit.ai-like format for compatibility
      const witLikeResponse = this._convertToWitFormat(extractedData.data);
      
      console.log('📊 ChatGPT extraction result:', JSON.stringify(witLikeResponse, null, 2));
      
      return {
        success: true,
        data: witLikeResponse,
        timestamp: new Date().toISOString(),
        message: 'Message processed successfully'
      };

    } catch (error) {
      console.error('❌ ChatGPT processing failed:', error);
      mongoLogger.error('ChatGPT processing failed', { 
        message, 
        error: error.message 
      });
      
      throw error;
    }
  }

  /**
   * Extract entities from a quote request message using ChatGPT
   * @param {string} message - The user's message
   * @returns {Object} Extracted entities
   */
  async extractEntities(message) {
    this._checkEnabled();
    
    try {
      const prompt = `
You are an expert at extracting product specification data from quote requests for packaging materials like mylar bags, labels, folding cartons, stand up pouches, etc.

Extract information from this message: "${message}"

Return a JSON object with these fields (use null if not mentioned):
{
  "product_type": "string", // e.g., "stand up pouch", "flat pouch", "pillow pouch", "label", "folding carton", "seal end box"
  "category": "string", // e.g., "mylar bag", "label", "folding carton" 
  "quantities": ["array of numbers"], // e.g., [1000, 2000, 5000] or single [5000]
  "dimensions": {
    "width": "number", // in inches
    "height": "number", // in inches  
    "depth": "number" // in inches, for 3D products
  },
  "materials": ["array of strings"], // e.g., ["PET", "White PE"], ["holographic", "MPET"]
  "finishes": ["array of strings"], // e.g., ["spot UV", "foil", "matte", "gloss", "soft touch"]
  "skus": "number", // number of different designs/SKUs
  "special_requirements": ["array of strings"], // e.g., ["white inside", "on roll"]
  "confidence_score": "number" // 0-1, how confident you are about the extraction
}

Key conversions:
- "5k" = [5000], "20k" = [20000], "12k" = [12000]
- "1000, 2000, 4000" = [1000, 2000, 4000]
- "100020004000" should be parsed as [1000, 2000, 4000] if it looks like concatenated quantities
- "4*5inches" or "4x5" = width: 4, height: 5  
- "4x6x2" = width: 4, height: 6, depth: 2
- "Matt + spot uv" = ["matte", "spot UV"]
- "PET + White PE" = ["PET", "White PE"]
- Extract individual materials, not compound strings
- "standup pouches" = category: "mylar bag", product_type: "stand up pouch"
- Map common product types to categories correctly

Only return the JSON object, no other text.`;

      const response = await this.client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-5-nano',
        messages: [
          {
            role: 'system',
            content: prompt
          }
        ],
        max_completion_tokens: 2000
      });

      const extractedData = JSON.parse(response.choices[0].message.content);
      
      mongoLogger.info('ChatGPT entity extraction successful', {
        message: message.substring(0, 100),
        extracted: extractedData
      });

      return {
        success: true,
        data: extractedData,
        usage: response.usage
      };

    } catch (error) {
      mongoLogger.error('ChatGPT entity extraction failed:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Convert ChatGPT response to Wit.ai-like format for compatibility
   * @param {Object} chatgptData - ChatGPT extracted data
   * @returns {Object} Wit.ai-like response
   */
  _convertToWitFormat(chatgptData) {
    const entities = {};
    const intents = [];

    // Add intent if we have product data
    if (chatgptData.product_type || chatgptData.quantity) {
      intents.push({
        confidence: chatgptData.confidence_score || 0.9,
        id: "quote_request",
        name: "get_quote"
      });
    }

    // Convert category
    if (chatgptData.category) {
      entities['category:category'] = [{
        body: chatgptData.category,
        confidence: chatgptData.confidence_score || 0.9,
        value: chatgptData.category,
        type: 'value'
      }];
    }

    // Convert product type
    if (chatgptData.product_type) {
      entities['product:product'] = [{
        body: chatgptData.product_type,
        confidence: chatgptData.confidence_score || 0.9,
        value: chatgptData.product_type,
        type: 'value'
      }];
    }

    // Convert quantities (now supports multiple quantities)
    if (chatgptData.quantities && chatgptData.quantities.length > 0) {
      entities['quantities:quantities'] = chatgptData.quantities.map(qty => ({
        body: qty.toString(),
        confidence: chatgptData.confidence_score || 0.9,
        value: qty,
        type: 'value'
      }));
    }

    // Convert dimensions
    if (chatgptData.dimensions) {
      const dims = [];
      if (chatgptData.dimensions.width) dims.push(chatgptData.dimensions.width);
      if (chatgptData.dimensions.height) dims.push(chatgptData.dimensions.height);
      if (chatgptData.dimensions.depth) dims.push(chatgptData.dimensions.depth);
      
      if (dims.length > 0) {
        entities['dimensions:dimensions'] = [{
          body: dims.join('x'),
          confidence: chatgptData.confidence_score || 0.9,
          value: dims.join('x'),
          type: 'value'
        }];
      }
    }

    // Convert materials (now supports multiple materials)
    if (chatgptData.materials && chatgptData.materials.length > 0) {
      entities['material:material'] = chatgptData.materials.map(material => ({
        body: material,
        confidence: chatgptData.confidence_score || 0.9,
        value: material,
        type: 'value'
      }));
    }

    // Convert finishes
    if (chatgptData.finishes && chatgptData.finishes.length > 0) {
      entities['finishes:finishes'] = chatgptData.finishes.map(finish => ({
        body: finish,
        confidence: chatgptData.confidence_score || 0.9,
        value: finish,
        type: 'value'
      }));
    }

    // Convert SKUs
    if (chatgptData.skus) {
      entities['skus:skus'] = [{
        body: chatgptData.skus.toString(),
        confidence: chatgptData.confidence_score || 0.9,
        value: chatgptData.skus,
        type: 'value'
      }];
    }

    return {
      entities,
      intents,
      text: '', // Will be filled by caller
      traits: {}
    };
  }

  /**
   * Generate a conversational response for quote confirmation
   * @param {Object} extractedData - The extracted entities
   * @returns {string} Generated response
   */
  async generateQuoteResponse(extractedData) {
    this._checkEnabled();
    
    try {
      const prompt = `
Generate a friendly, professional WhatsApp message confirming the quote details.
Based on this extracted data: ${JSON.stringify(extractedData)}

The message should:
1. Confirm the product details
2. List the specifications clearly
3. Ask for any missing information
4. Be conversational and helpful
5. Use emojis appropriately
6. Keep it under 300 characters

Example style: "Great! I understand you need 20,000 standup pouches 📦 with spot UV and foil finishes ✨. Size: standard, 4 SKUs, white inside. Let me prepare your quote! Is there anything else I should know?"`;

      const response = await this.client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-5-nano',
        messages: [
          {
            role: 'system',
            content: prompt
          }
        ],
        max_completion_tokens: 800
      });

      return response.choices[0].message.content.trim();

    } catch (error) {
      mongoLogger.error('ChatGPT response generation failed:', error);
      return "Thank you for your quote request! I'm processing the details and will get back to you shortly. 📋";
    }
  }

  /**
   * Convert voice message text to structured quote request
   * @param {string} voiceText - Transcribed voice message
   * @returns {Object} Processed quote data
   */
  async processVoiceMessage(voiceText) {
    this._checkEnabled();
    
    try {
      const prompt = `
Clean up and structure this voice-to-text transcription of a quote request: "${voiceText}"

1. Fix any transcription errors
2. Make it grammatically correct  
3. Preserve all technical specifications
4. Return both the cleaned text and extracted entities

Return JSON:
{
  "cleaned_text": "string",
  "entities": {
    // same structure as extractEntities method
  }
}`;

      const response = await this.client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-5-nano',
        messages: [
          {
            role: 'system',
            content: prompt
          }
        ],
        max_completion_tokens: 1500
      });

      return {
        success: true,
        data: JSON.parse(response.choices[0].message.content)
      };

    } catch (error) {
      mongoLogger.error('Voice message processing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export both the class and an instance
export { ChatGPTService };
export default new ChatGPTService();