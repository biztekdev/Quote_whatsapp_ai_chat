import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

async function testEntityExtraction() {
  console.log('🧪 Testing entity extraction with gpt-5-nano...');
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  const prompt = `
You are an expert at extracting product specification data from quote requests for packaging materials like mylar bags, labels, folding cartons, stand up pouches, etc.

Extract information from this message: "Need 5k quantity, 4*5inches size, Pillow pouch ( holographic material), number of designs 5, finish will be Matt + spot uv"

Return a JSON object with these fields (use null if not mentioned):
{
  "product_type": "string",
  "category": "string", 
  "quantities": ["array of numbers"],
  "dimensions": {
    "width": "number",
    "height": "number",
    "depth": "number"
  },
  "materials": ["array of strings"],
  "finishes": ["array of strings"],
  "skus": "number",
  "special_requirements": ["array of strings"],
  "confidence_score": "number"
}

Only return the JSON object, no other text.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: prompt
        }
      ],
      max_completion_tokens: 2000
    });
    
    console.log('Raw response:');
    console.log('Content:', JSON.stringify(response.choices[0].message.content));
    console.log('Length:', response.choices[0].message.content?.length || 0);
    console.log('Usage:', response.usage);
    
    if (response.choices[0].message.content) {
      try {
        const parsed = JSON.parse(response.choices[0].message.content);
        console.log('✅ Successfully parsed JSON:', parsed);
      } catch (parseError) {
        console.log('❌ JSON parse error:', parseError.message);
        console.log('Raw content:', response.choices[0].message.content);
      }
    } else {
      console.log('❌ Empty response content');
    }
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
  }
}

testEntityExtraction();