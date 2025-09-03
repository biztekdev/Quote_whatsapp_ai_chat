# 📨 Webhook POST Curl Commands

## 🎯 WhatsApp Webhook Testing

Your webhook endpoint receives POST requests from WhatsApp when messages are sent to your business number. Here are curl commands to test and simulate webhook calls.

### 🔧 **Basic Configuration**

**Local Server**: `http://localhost:5000`
**Production**: `https://your-app-name.vercel.app` (replace with your actual URL)

---

## 📥 **Webhook Endpoint: POST /webhook**

### **1. Text Message Webhook**
```bash
curl -X POST http://localhost:5000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [
      {
        "id": "489160957621782",
        "changes": [
          {
            "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                "display_phone_number": "15550000000",
                "phone_number_id": "489160957621782"
              },
              "contacts": [
                {
                  "profile": {
                    "name": "John Doe"
                  },
                  "wa_id": "923260533337"
                }
              ],
              "messages": [
                {
                  "from": "923260533337",
                  "id": "wamid.HBgMOTIzMjYwNTMzMzM3FQIAERgSNzc4RjhBODBFQTlBRjA2ODA1AA==",
                  "timestamp": "1693804800",
                  "text": {
                    "body": "Hello! I need a quote for web development"
                  },
                  "type": "text"
                }
              ]
            },
            "field": "messages"
          }
        ]
      }
    ]
  }'
```

### **2. Button Reply Webhook**
```bash
curl -X POST http://localhost:5000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [
      {
        "id": "489160957621782",
        "changes": [
          {
            "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                "display_phone_number": "15550000000",
                "phone_number_id": "489160957621782"
              },
              "contacts": [
                {
                  "profile": {
                    "name": "Jane Smith"
                  },
                  "wa_id": "923260533337"
                }
              ],
              "messages": [
                {
                  "from": "923260533337",
                  "id": "wamid.HBgMOTIzMjYwNTMzMzM3FQIAERgSNzc4RjhBODBFQTlBRjA2ODA1BB==",
                  "timestamp": "1693804860",
                  "type": "interactive",
                  "interactive": {
                    "type": "button_reply",
                    "button_reply": {
                      "id": "get_quote",
                      "title": "Get Quote"
                    }
                  }
                }
              ]
            },
            "field": "messages"
          }
        ]
      }
    ]
  }'
```

### **3. Image Message Webhook**
```bash
curl -X POST http://localhost:5000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [
      {
        "id": "489160957621782",
        "changes": [
          {
            "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                "display_phone_number": "15550000000",
                "phone_number_id": "489160957621782"
              },
              "contacts": [
                {
                  "profile": {
                    "name": "Mike Johnson"
                  },
                  "wa_id": "923260533337"
                }
              ],
              "messages": [
                {
                  "from": "923260533337",
                  "id": "wamid.HBgMOTIzMjYwNTMzMzM3FQIAERgSNzc4RjhBODBFQTlBRjA2ODA1CC==",
                  "timestamp": "1693804920",
                  "type": "image",
                  "image": {
                    "caption": "This is my project requirement",
                    "mime_type": "image/jpeg",
                    "sha256": "4GQATiigKI9rWZEjAy5Zb+W9W5VJ5qWJlRqlZa5a5a5a",
                    "id": "1234567890123456"
                  }
                }
              ]
            },
            "field": "messages"
          }
        ]
      }
    ]
  }'
```

### **4. Message Status Webhook**
```bash
curl -X POST http://localhost:5000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [
      {
        "id": "489160957621782",
        "changes": [
          {
            "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                "display_phone_number": "15550000000",
                "phone_number_id": "489160957621782"
              },
              "statuses": [
                {
                  "id": "wamid.HBgMOTIzMjYwNTMzMzM3FQIAERgSODBENEQxRTM1RDkxMEUzMzgwAA==",
                  "status": "delivered",
                  "timestamp": "1693804980",
                  "recipient_id": "923260533337",
                  "conversation": {
                    "id": "e7d0e4f0-0b0a-4b0a-8b0a-0b0a0b0a0b0a",
                    "expiration_timestamp": "1693891380",
                    "origin": {
                      "type": "business_initiated"
                    }
                  },
                  "pricing": {
                    "billable": true,
                    "pricing_model": "CBP",
                    "category": "business_initiated"
                  }
                }
              ]
            },
            "field": "messages"
          }
        ]
      }
    ]
  }'
```

---

## 🧪 **Test Scripts**

### **PowerShell Test Script**
```powershell
# Test multiple webhook scenarios
$baseUrl = "http://localhost:5000"

# Test 1: Text message
Write-Host "📨 Testing text message webhook..." -ForegroundColor Green
$textPayload = @{
    object = "whatsapp_business_account"
    entry = @(
        @{
            id = "489160957621782"
            changes = @(
                @{
                    value = @{
                        messaging_product = "whatsapp"
                        metadata = @{
                            display_phone_number = "15550000000"
                            phone_number_id = "489160957621782"
                        }
                        contacts = @(
                            @{
                                profile = @{ name = "Test User" }
                                wa_id = "923260533337"
                            }
                        )
                        messages = @(
                            @{
                                from = "923260533337"
                                id = "wamid.test123"
                                timestamp = [string][int](Get-Date -UFormat %s)
                                text = @{ body = "Hello! I need a quote for my project" }
                                type = "text"
                            }
                        )
                    }
                    field = "messages"
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/webhook" -Method POST -Body $textPayload -ContentType "application/json"
    Write-Host "✅ Success: $($response.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Button reply
Write-Host "🔘 Testing button reply webhook..." -ForegroundColor Green
$buttonPayload = @{
    object = "whatsapp_business_account"
    entry = @(
        @{
            id = "489160957621782"
            changes = @(
                @{
                    value = @{
                        messaging_product = "whatsapp"
                        metadata = @{
                            display_phone_number = "15550000000"
                            phone_number_id = "489160957621782"
                        }
                        contacts = @(
                            @{
                                profile = @{ name = "Test User" }
                                wa_id = "923260533337"
                            }
                        )
                        messages = @(
                            @{
                                from = "923260533337"
                                id = "wamid.test456"
                                timestamp = [string][int](Get-Date -UFormat %s)
                                type = "interactive"
                                interactive = @{
                                    type = "button_reply"
                                    button_reply = @{
                                        id = "get_quote"
                                        title = "Get Quote"
                                    }
                                }
                            }
                        )
                    }
                    field = "messages"
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/webhook" -Method POST -Body $buttonPayload -ContentType "application/json"
    Write-Host "✅ Success: $($response.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "🔍 Check your database for stored webhook data!" -ForegroundColor Yellow
```

---

## 📊 **Check Results**

After sending webhook POST requests, you can verify the data was stored:

### **Check Recent Webhook Calls**
```bash
curl http://localhost:5000/analytics/recent-calls?limit=5
```

### **Check Webhook Statistics**
```bash
curl http://localhost:5000/analytics/webhooks
```

### **Check Server Health**
```bash
curl http://localhost:5000/health
```

---

## 🔍 **Expected Responses**

### **Successful Webhook Response**
```json
{
  "status": "ok",
  "processingTime": "145ms",
  "timestamp": "2025-09-04T10:30:00.000Z"
}
```

### **Error Response**
```json
{
  "error": "Internal Server Error",
  "message": "Error details here",
  "timestamp": "2025-09-04T10:30:00.000Z"
}
```

---

## 🎯 **Production Testing**

Replace `localhost:5000` with your production URL:

```bash
# Production webhook test
curl -X POST https://your-app-name.vercel.app/webhook \
  -H "Content-Type: application/json" \
  -d '{ ... webhook payload ... }'
```

---

## 📝 **Notes**

- ✅ All webhook calls are automatically stored in MongoDB
- ✅ User information and message analytics are tracked
- ✅ AI processing results are saved
- ✅ Performance metrics are recorded
- ✅ Error tracking is comprehensive

**Your webhook endpoint is ready to receive and process WhatsApp messages with full database tracking!** 🚀📊
