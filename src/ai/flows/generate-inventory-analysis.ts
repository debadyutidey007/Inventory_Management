'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a comprehensive inventory analysis.
 *
 * - generateInventoryAnalysis - A function that generates a health report based on all inventory items.
 * - GenerateInventoryAnalysisInput - The input type for the function.
 * - GenerateInventoryAnalysisOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInventoryAnalysisInputSchema = z.object({
  inventoryItems: z.array(
    z.object({
      itemId: z.string().describe('The unique identifier for the item.'),
      itemName: z.string().describe('The name of the item.'),
      currentQuantity: z.number().describe('The current quantity in stock.'),
      reorderPoint: z.number().describe('The reorder point for the item.'),
      averageDailySales: z
        .number()
        .describe('The average daily sales volume of the item.'),
      sellingPrice: z.number().describe('The selling price of the item.'),
      supplierName: z.string().describe('The name of the supplier.'),
      leadTimeDays: z.number().describe('The lead time in days from the supplier.'),
    })
  ).describe('An array of all items in the inventory.'),
});
export type GenerateInventoryAnalysisInput = z.infer<typeof GenerateInventoryAnalysisInputSchema>;

const ItemDetailSchema = z.object({
  name: z.string().describe('The name of the item.'),
  quantity: z.number().describe('The current quantity in stock.'),
  price: z.number().describe('The selling price of the item.'),
});

const GenerateInventoryAnalysisOutputSchema = z.object({
  overallHealthScore: z.number().int().min(0).max(100).describe('A score from 0-100 representing the overall health of the inventory. 100 is perfect.'),
  analysis: z.array(z.object({
    title: z.string().describe('The title of the analysis section (e.g., "Best Sellers", "Slow Movers", "Recommendations").'),
    points: z.array(z.string()).describe('A list of key observations or recommendations for this section.')
  })).describe("A structured analysis of the inventory's health, broken down into key areas."),
  lowStockItems: z.array(ItemDetailSchema).describe('A list of items with a quantity of 0, including their key attributes.'),
  inStockItems: z.array(ItemDetailSchema).describe('A list of items with a quantity greater than 0, including their key attributes.')
});
export type GenerateInventoryAnalysisOutput = z.infer<typeof GenerateInventoryAnalysisOutputSchema>;

export async function generateInventoryAnalysis(input: GenerateInventoryAnalysisInput): Promise<GenerateInventoryAnalysisOutput> {
  return generateInventoryAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInventoryAnalysisPrompt',
  input: {schema: GenerateInventoryAnalysisInputSchema},
  output: {schema: GenerateInventoryAnalysisOutputSchema},
  prompt: `You are a world-class AI inventory management consultant. Your task is to conduct a comprehensive health check of the entire inventory and provide a strategic analysis.

  Analyze the provided data for all inventory items to generate a structured report. Your response must be highly professional, insightful, and strategic.

  **1. Overall Health Score (0-100):**
  Calculate a single health score for the entire inventory using the following weighted methodology. Base this on a holistic view:
  - **Stock Levels (50% weight):** Are items appropriately stocked?
      - For each item, calculate a stock level score (0-100). 100 is perfect (quantity is exactly at reorder point * 1.5).
      - Penalize for being out-of-stock (score of 0).
      - Penalize for significant overstock (e.g., quantity > 3 * reorder point).
      - Average the scores for all items.
  - **Sales Velocity (30% weight):** Are items selling well?
      - Categorize items as "Fast Mover" (sells > 10 units/day), "Medium Mover" (1-10 units/day), "Slow Mover" (<1 unit/day).
      - Calculate a score based on the distribution. A healthy inventory has a good mix, but a high percentage of slow-movers should lower the score. (e.g., % Fast * 100 + % Medium * 70 + % Slow * 30).
  - **Risk (20% weight):**
      - Identify items where the 'days until stockout' (quantity / avg daily sales) is less than the supplier lead time.
      - The higher the percentage of items at risk of stocking out, the lower the score. (e.g., 100 - (% of at-risk items * 2)).
  - Combine these weighted scores into a final health score from 0-100. A score below 50 indicates critical issues.

  **2. Structured Analysis:**
  Provide a breakdown of your findings into the following sections. For each section, provide a few bullet points highlighting the most important insights. Be concise and impactful.
  - **Best Sellers:** Identify the top-performing items based on sales velocity and value. Comment on their stock levels. Are they well-managed?
  - **Slow Movers:** Identify items with low sales velocity or those that are significantly overstocked (quantity far exceeds reorder point and sales rate).
  - **Recommendations:** Based on your analysis, provide a list of strategic recommendations to improve inventory health. Examples: "Consider a promotional campaign for [Slow Mover Item Name]", "Urgently re-order [Critical Low Stock Item Name]", "Increase reorder point for [Best Seller Name] to avoid stockouts."

  **3. Item Lists:**
  - **Low Stock Items:** Populate the 'lowStockItems' array with all items that have a current quantity of 0. Include their name, quantity, and price.
  - **In-Stock Items:** Populate the 'inStockItems' array with all items that have a current quantity greater than 0. Include their name, quantity, and price.


  Here is the data for all inventory items:

  {{#each inventoryItems}}
  - Item: {{itemName}} (ID: {{itemId}})
    - Current Quantity: {{currentQuantity}}
    - Re-order Point: {{reorderPoint}}
    - Avg. Daily Sales: {{averageDailySales}}
    - Selling Price: $ {{sellingPrice}}
    - Supplier: {{supplierName}}
    - Lead Time: {{leadTimeDays}} days
  {{/each}}

  Based on this complete data set, generate the comprehensive inventory health analysis.
  `,
});

const generateInventoryAnalysisFlow = ai.defineFlow(
  {
    name: 'generateInventoryAnalysisFlow',
    inputSchema: GenerateInventoryAnalysisInputSchema,
    outputSchema: GenerateInventoryAnalysisOutputSchema,
  },
  async input => {
    // Log the input before sending it to the prompt
    console.log('Input for generateInventoryAnalysisFlow:', JSON.stringify(input, null, 2));

    const {output} = await prompt(input);

    // Log the output received from the prompt
    console.log('Output from generateInventoryAnalysisFlow:', JSON.stringify(output, null, 2));

    return output!;
  }
);