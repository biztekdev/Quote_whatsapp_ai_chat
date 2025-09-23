import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

async function testOpenAIKey() {
  console.log('🔑 Testing OpenAI API Key...\n');
  
  // Check if API key exists
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ OPENAI_API_KEY not found in environment variables');
    console.log('💡 Please add OPENAI_API_KEY=your_actual_key_here to your .env file');
    return false;
  }
  
  if (apiKey === 'your_openai_api_key_here') {
    console.log('❌ OPENAI_API_KEY is still using placeholder value');
    console.log('💡 Please replace with your actual OpenAI API key in .env file');
    return false;
  }
  
  console.log(`✅ API Key found: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log(`📏 API Key length: ${apiKey.length} characters\n`);
  
  // Test API connection
  try {
    console.log('🧪 Testing API connection...');
    
    const openai = new OpenAI({
      apiKey: apiKey,
    });
    
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-nano',
      messages: [
        {
          role: 'user',
          content: 'Say "Hello World" to test the connection.'
        }
      ],
      max_completion_tokens: 10
    });
    
    console.log('✅ API Connection successful!');
    console.log(`🤖 Model used: ${response.model}`);
    console.log(`💬 Response: ${response.choices[0].message.content}`);
    console.log(`🔢 Tokens used: ${response.usage.total_tokens}`);
    return true;
    
  } catch (error) {
    console.log('❌ API Connection failed:');
    console.log(`Error: ${error.message}`);
    
    if (error.status === 401) {
      console.log('🚨 This indicates your API key is invalid or expired');
    } else if (error.status === 429) {
      console.log('🚨 Rate limit exceeded - your key is valid but you\'ve hit usage limits');
    } else if (error.status === 403) {
      console.log('🚨 Access forbidden - check if your API key has the required permissions');
    }
    return false;
  }
}

// Test the ChatGPT service specifically
async function testChatGPTService() {
  console.log('\n🔧 Testing ChatGPT Service...\n');
  
  try {
    const { default: ChatGPTService } = await import('./services/chatgptService.js');
    
    console.log('📋 Testing entity extraction...');
    const testMessages = [
      "Need 5k quantity, 4*5inches size, Pillow pouch ( holographic material), number of designs 5, finish will be Matt + spot uv",
      "I am looking for 20000 standup pouches on standard size with spot UV and foil. I have 4 different flavors and I need white inside the pouch. Can you quote a price for me?",
      "Need label quote for round labels, 3 inch diameter, 1000 quantity"
    ];
    
    for (let i = 0; i < testMessages.length; i++) {
      console.log(`\n🧪 Test ${i + 1}:`);
      console.log(`Message: "${testMessages[i]}"`);
      
      try {
        const result = await ChatGPTService.processMessage(testMessages[i]);
        
        if (result.success) {
          console.log('✅ Entity extraction successful!');
          console.log('📊 Extracted entities:', JSON.stringify(result.data?.entities || {}, null, 2));
        } else {
          console.log('❌ Entity extraction failed:', result.error);
        }
      } catch (error) {
        console.log('❌ Service call failed:', error.message);
      }
    }
    
  } catch (error) {
    console.log('❌ ChatGPT Service test failed:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting ChatGPT Integration Tests\n');
  
  const keyTestPassed = await testOpenAIKey();
  
  if (keyTestPassed) {
    await testChatGPTService();
  } else {
    console.log('\n⏭️ Skipping service tests due to API key issues');
  }
  
  console.log('\n🏁 Test completed!');
}

runTests().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});