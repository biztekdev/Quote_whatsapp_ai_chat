// Test material selection improvements
import fs from 'fs/promises';

// Mock the material finding function
const mockMaterials = [
    { _id: '1', name: 'PET Film', erp_id: 101, isActive: true },
    { _id: '2', name: 'MPET Film', erp_id: 102, isActive: true },
    { _id: '3', name: 'PE Film', erp_id: 103, isActive: true },
    { _id: '4', name: 'PET + MPET + PE Laminate', erp_id: 104, isActive: true },
    { _id: '5', name: '3-Layer PET/MET/PE', erp_id: 105, isActive: true },
    { _id: '6', name: 'Aluminum Foil', erp_id: 106, isActive: true }
];

function findMaterialByName(materialName) {
    console.log("🔍 Searching for material:", materialName);
    
    // Search in name field (exact match first)
    let foundMaterial = mockMaterials.find(material =>
        material.name.toLowerCase() === materialName.toLowerCase()
    );
    
    if (foundMaterial) {
        console.log("🎯 Found exact match:", foundMaterial.name);
        return foundMaterial;
    }
    
    // If not found, search for partial match in name
    foundMaterial = mockMaterials.find(material =>
        material.name.toLowerCase().includes(materialName.toLowerCase())
    );
    
    if (foundMaterial) {
        console.log("🎯 Found partial match in name:", foundMaterial.name);
        return foundMaterial;
    }
    
    // Try searching for composite materials like "PET+MET+PE" or "PET + MPET + PE"
    if (!foundMaterial) {
        console.log("🔍 Trying composite material search for:", materialName);
        
        // Split by common separators: +, -, space, etc.
        const materialParts = materialName.split(/[+\-\s,]+/).map(part => part.trim().toUpperCase()).filter(part => part.length > 0);
        console.log("🔍 Material parts:", materialParts);
        
        // Try to find a material that contains all the parts
        foundMaterial = mockMaterials.find(material => {
            const materialNameUpper = material.name.toUpperCase();
            const allPartsPresent = materialParts.every(part => 
                materialNameUpper.includes(part)
            );
            console.log(`🔍 Checking material "${material.name}" against parts [${materialParts.join(', ')}]: ${allPartsPresent}`);
            return allPartsPresent;
        });
        
        // If no material contains all parts, try to find one with most parts
        if (!foundMaterial && materialParts.length > 1) {
            console.log("🔍 No exact composite match, trying partial composite match");
            let bestMatch = null;
            let maxMatches = 0;
            
            for (const material of mockMaterials) {
                const materialNameUpper = material.name.toUpperCase();
                const matches = materialParts.filter(part => 
                    materialNameUpper.includes(part)
                ).length;
                
                console.log(`🔍 Material "${material.name}" matches ${matches}/${materialParts.length} parts`);
                
                if (matches > maxMatches && matches >= Math.ceil(materialParts.length / 2)) {
                    maxMatches = matches;
                    bestMatch = material;
                }
            }
            
            if (bestMatch) {
                foundMaterial = bestMatch;
                console.log(`🎯 Best composite match: ${bestMatch.name} (${maxMatches}/${materialParts.length} parts)`);
            }
        }
        
        // Fallback: try finding any material containing any of the parts
        if (!foundMaterial) {
            console.log("🔍 Trying fallback search for any part");
            for (const part of materialParts) {
                foundMaterial = mockMaterials.find(material =>
                    material.name.toUpperCase().includes(part)
                );
                if (foundMaterial) {
                    console.log(`🎯 Found material containing "${part}": ${foundMaterial.name}`);
                    break;
                }
            }
        }
    }
    
    console.log("Material search result:", foundMaterial ? foundMaterial.name : "Not found");
    return foundMaterial;
}

// Test cases
const testCases = [
    "PET+MET+PE",
    "PET + MPET + PE", 
    "PET",
    "MPET",
    "PET Film",
    "3-Layer",
    "Aluminum",
    "NonExistentMaterial"
];

console.log("🧪 Testing material search improvements...\n");

testCases.forEach((testCase, index) => {
    console.log(`\n--- Test ${index + 1}: "${testCase}" ---`);
    const result = findMaterialByName(testCase);
    console.log(`Result: ${result ? `✅ Found: ${result.name}` : '❌ Not found'}`);
});

console.log("\n🎉 Material search test completed!");