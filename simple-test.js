import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

async function testAPI() {
  console.log('🧪 Testing OpenAI API with gpt-5-nano...');
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'user',
          content: 'Say hello'
        }
      ],
      max_completion_tokens: 10
    });
    
    console.log('✅ Success!');
    console.log('Model:', response.model);
    console.log('Response:', response.choices[0].message.content);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();