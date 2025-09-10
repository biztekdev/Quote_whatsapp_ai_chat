# Complete Database Entity Relationship Diagram (ERD)
## Quote AI WhatsApp System

This document provides a comprehensive overview of the database schema and relationships for the Quote AI WhatsApp System.

## Database Overview

The system uses MongoDB with Mongoose ODM and consists of 8 main collections with proper relationships:

1. **users** - Customer/User information
2. **product_categories** - Product categories (Mylar Bags, Stand Up Pouches, etc.)
3. **products** - Individual products within categories
4. **materials** - Materials available for each product category
5. **finish_categories** - Categories for finishes (Printing, Lamination, etc.)
6. **product_finishes** - Specific finishes available for products
7. **quotes** - Generated quotes for customers
8. **conversation_states** - Chat conversation state management

---

## Entities and Relationships

### 1. Users Collection
```
users {
  _id: ObjectId (Primary Key)
  name: String (required)
  phone: String (required, unique, indexed)
  email: String (optional, validated)
  isActive: Boolean (default: true)
  lastInteraction: Date (default: now)
  totalQuotes: Number (default: 0)
  createdAt: Date (auto)
  updatedAt: Date (auto)
}

Indexes:
- phone (unique)
- email (sparse)
- createdAt (descending)
```

### 2. Product Categories Collection
```
product_categories {
  _id: ObjectId (Primary Key)
  name: String (required, unique)
  description: String
  isActive: Boolean (default: true)
  sortOrder: Number (default: 0)
  createdAt: Date (auto)
  updatedAt: Date (auto)
}

Examples:
- Mylar Bags
- Stand Up Pouches
- Flat Pouches
- Gusseted Bags
```

### 3. Products Collection
```
products {
  _id: ObjectId (Primary Key)
  name: String (required)
  categoryId: ObjectId (required, ref: 'ProductCategory')
  description: String
  basePrice: Number (required, min: 0)
  dimensionFields: Array [
    {
      name: String (required)
      unit: String (default: 'inches')
      isRequired: Boolean (default: true)
      minValue: Number (default: 0)
      maxValue: Number
    }
  ]
  isActive: Boolean (default: true)
  sortOrder: Number (default: 0)
  imageUrl: String
  createdAt: Date (auto)
  updatedAt: Date (auto)
}

Indexes:
- categoryId + isActive
- name

Relationships:
- products.categoryId → product_categories._id (Many-to-One)
```

### 4. Materials Collection
```
materials {
  _id: ObjectId (Primary Key)
  name: String (required)
  categoryId: ObjectId (required, ref: 'ProductCategory')
  description: String
  pricePerUnit: Number (required, min: 0)
  unit: String (default: 'sq ft', enum: ['sq ft', 'sq inch', 'linear ft', 'piece', 'kg', 'gram'])
  thickness: String (e.g., "3.5 mil", "5 mil")
  specifications: Array [
    {
      property: String
      value: String
    }
  ]
  isActive: Boolean (default: true)
  sortOrder: Number (default: 0)
  createdAt: Date (auto)
  updatedAt: Date (auto)
}

Indexes:
- categoryId + isActive
- name

Relationships:
- materials.categoryId → product_categories._id (Many-to-One)
```

### 5. Finish Categories Collection
```
finish_categories {
  _id: ObjectId (Primary Key)
  name: String (required, unique)
  description: String
  isActive: Boolean (default: true)
  sortOrder: Number (default: 0)
  createdAt: Date (auto)
  updatedAt: Date (auto)
}

Examples:
- Printing
- Lamination
- Coating
- Embossing
```

### 6. Product Finishes Collection
```
product_finishes {
  _id: ObjectId (Primary Key)
  name: String (required)
  categoryId: ObjectId (required, ref: 'FinishCategory')
  productCategoryId: ObjectId (required, ref: 'ProductCategory')
  description: String
  priceType: String (enum: ['fixed', 'percentage', 'per_unit'], default: 'fixed')
  price: Number (required, min: 0)
  unit: String (default: 'piece')
  specifications: Array [
    {
      property: String
      value: String
    }
  ]
  processingTime: String (default: "Standard")
  isActive: Boolean (default: true)
  sortOrder: Number (default: 0)
  imageUrl: String
  createdAt: Date (auto)
  updatedAt: Date (auto)
}

Indexes:
- categoryId + productCategoryId + isActive
- productCategoryId + isActive
- name

Relationships:
- product_finishes.categoryId → finish_categories._id (Many-to-One)
- product_finishes.productCategoryId → product_categories._id (Many-to-One)
```

### 7. Quotes Collection
```
quotes {
  _id: ObjectId (Primary Key)
  quoteNumber: String (required, unique, auto-generated)
  userId: ObjectId (required, ref: 'User')
  productId: ObjectId (required, ref: 'Product')
  materialId: ObjectId (required, ref: 'Material')
  finishId: ObjectId (required, ref: 'ProductFinish')
  dimensions: Array [
    {
      name: String (required)
      value: Number (required)
      unit: String (default: 'inches')
    }
  ]
  quantity: Number (required, min: 1)
  pricing: {
    basePrice: Number (required)
    materialCost: Number (required)
    finishCost: Number (required)
    quantityDiscount: Number (default: 0)
    subtotal: Number (required)
    tax: Number (default: 0)
    shipping: Number (default: 0)
    totalPrice: Number (required)
  }
  status: String (enum: ['draft', 'pending', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'cancelled'], default: 'draft')
  validUntil: Date (default: 7 days from creation)
  notes: String
  customerNotes: String
  sentAt: Date
  viewedAt: Date
  respondedAt: Date
  createdAt: Date (auto)
  updatedAt: Date (auto)
}

Indexes:
- userId + status
- quoteNumber (unique)
- status + validUntil
- createdAt (descending)

Relationships:
- quotes.userId → users._id (Many-to-One)
- quotes.productId → products._id (Many-to-One)
- quotes.materialId → materials._id (Many-to-One)
- quotes.finishId → product_finishes._id (Many-to-One)
```

### 8. Conversation States Collection
```
conversation_states {
  _id: ObjectId (Primary Key)
  userId: ObjectId (required, ref: 'User')
  phone: String (required, indexed)
  currentStep: String (enum: [
    'start',
    'greeting_response', 
    'product_category_selection',
    'product_selection', 
    'dimension_input', 
    'material_selection', 
    'finish_selection', 
    'quantity_input', 
    'quote_review',
    'quote_generation', 
    'completed'
  ], default: 'start')
  conversationData: {
    wantsQuote: Boolean
    selectedCategoryId: ObjectId (ref: 'ProductCategory')
    selectedProductId: ObjectId (ref: 'Product')
    selectedMaterialId: ObjectId (ref: 'Material')
    selectedFinishId: ObjectId (ref: 'ProductFinish')
    dimensions: Array [
      {
        name: String
        value: Number
        unit: String
      }
    ]
    quantity: Number
    currentDimensionIndex: Number (default: 0)
  }
  lastMessageAt: Date (default: now)
  isActive: Boolean (default: true)
  completedAt: Date
  createdAt: Date (auto)
  updatedAt: Date (auto)
}

Indexes:
- userId + isActive
- phone + isActive
- lastMessageAt

Relationships:
- conversation_states.userId → users._id (One-to-One active)
- conversation_states.conversationData.selectedCategoryId → product_categories._id
- conversation_states.conversationData.selectedProductId → products._id
- conversation_states.conversationData.selectedMaterialId → materials._id
- conversation_states.conversationData.selectedFinishId → product_finishes._id
```

---

## Relationship Summary

### Primary Relationships:
1. **Users → Quotes** (One-to-Many)
   - One user can have multiple quotes
   
2. **Users → Conversation States** (One-to-One Active)
   - One user has one active conversation at a time

3. **Product Categories → Products** (One-to-Many)
   - One category contains multiple products
   
4. **Product Categories → Materials** (One-to-Many)
   - One category has multiple available materials
   
5. **Product Categories → Product Finishes** (One-to-Many)
   - One product category has multiple available finishes

6. **Finish Categories → Product Finishes** (One-to-Many)
   - One finish category contains multiple specific finishes

7. **Products → Quotes** (One-to-Many)
   - One product can be quoted multiple times
   
8. **Materials → Quotes** (One-to-Many)
   - One material can be used in multiple quotes
   
9. **Product Finishes → Quotes** (One-to-Many)
   - One finish can be applied to multiple quotes

### Reference Relationships in Conversation States:
- **Product Categories → Conversation States** (One-to-Many)
- **Products → Conversation States** (One-to-Many)
- **Materials → Conversation States** (One-to-Many)
- **Product Finishes → Conversation States** (One-to-Many)

---

## Data Flow and Business Logic

### Quote Generation Process:
1. **User Registration**: User data stored in `users` collection
2. **Conversation Management**: Active conversation tracked in `conversation_states`
3. **Product Selection**: User selects from `product_categories` → `products`
4. **Material Selection**: User selects from available `materials` for the product category
5. **Finish Selection**: User selects from available `product_finishes` for the product category
6. **Quote Creation**: Complete quote generated and stored in `quotes` collection with references to all selected items

### Key Business Rules:
- Materials are category-specific (same material type for different categories)
- Finishes are both category-specific and product-category-specific
- Quotes maintain full referential integrity to ensure data consistency
- Conversation states track the complete user journey through the quote process
- Users can have multiple quotes but only one active conversation

---

## Indexes and Performance

### Critical Indexes:
1. **users.phone** - Unique lookup for WhatsApp integration
2. **quotes.userId + quotes.status** - Quote management per user
3. **conversation_states.phone + conversation_states.isActive** - Active conversation lookup
4. **products.categoryId + products.isActive** - Product filtering
5. **materials.categoryId + materials.isActive** - Material filtering
6. **product_finishes.productCategoryId + product_finishes.isActive** - Finish filtering

### Compound Indexes:
- Enable efficient filtering and sorting operations
- Support pagination and search functionality
- Optimize relationship queries

---

## Scalability Considerations

1. **Horizontal Scaling**: MongoDB collections can be sharded by appropriate shard keys
2. **Read Replicas**: Separate read operations for analytics and reporting
3. **Caching Layer**: Redis for frequently accessed product catalogs
4. **Archive Strategy**: Move old quotes and conversations to archive collections
5. **Indexing Strategy**: Monitor and optimize indexes based on query patterns

This ERD provides a robust foundation for a scalable quote management system with proper data relationships and integrity constraints.
