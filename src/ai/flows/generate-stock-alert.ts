
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating intelligent stock alerts.
 *
 * - generateStockAlert - A function that generates a stock alert based on provided data.
 * - GenerateStockAlertInput - The input type for the generateStockAlert function.
 * - GenerateStockAlertOutput - The return type for the generateStockAlert function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStockAlertInputSchema = z.object({
  lowStockItems: z.array(
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
  ).describe('An array of items with low stock levels.'),
});
export type GenerateStockAlertInput = z.infer<typeof GenerateStockAlertInputSchema>;

const GenerateStockAlertOutputSchema = z.object({
  potentialRevenueLoss: z.number().describe('The total estimated potential revenue loss in USD for all low-stock items if they are not restocked.'),
  overallDisruptionLevel: z.enum(["Low", "Medium", "High"]).describe('An overall assessment of the disruption level to the business (Low, Medium, or High).'),
  suggestedActions: z.array(z.object({
    itemName: z.string().describe('The name of the item requiring action.'),
    action: z.string().describe('The suggested course of action for this specific item.'),
    priority: z.number().int().describe('The priority of the action, where 1 is the highest priority.')
  })).describe('A prioritized list of suggested actions to mitigate the stock issues.'),
});
export type GenerateStockAlertOutput = z.infer<typeof GenerateStockAlertOutputSchema>;

export async function generateStockAlert(input: GenerateStockAlertInput): Promise<GenerateStockAlertOutput> {
  return generateStockAlertFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateStockAlertPrompt',
  input: {schema: GenerateStockAlertInputSchema},
  output: {schema: GenerateStockAlertOutputSchema},
  prompt: `You are a world-class AI inventory management strategist. Your task is to analyze a list of low-stock items and provide a highly advanced and actionable alert.

  Analyze the provided data to generate a structured alert with the following components:

  1.  **Potential Revenue Loss**: Calculate the total estimated revenue at risk if all these items go completely out of stock before they can be replenished. Base this on the remaining stock, average daily sales, and selling price.

  2.  **Overall Disruption Level**: Assess the overall business disruption. Consider the number of critical items, how quickly they are selling out, and supplier lead times. Categorize this as 'Low', 'Medium', or 'High'. A few fast-selling items with long lead times could be a 'High' disruption, even if the total revenue loss is moderate.

  3.  **Suggested Courses of Action**: Provide a list of clear, prioritized, and actionable steps for the inventory manager. For each action, specify the item, the recommended action (e.g., "Immediate re-order," "Expedite shipment," "Contact supplier"), and a priority level (1 being the most urgent). Prioritize actions based on which items will stock out the soonest (days until stockout = current quantity / average daily sales) and their lead time. Items that will stock out before the supplier can deliver should be the highest priority.

  Here is the data for the low-stock items:

  {{#each lowStockItems}}
  - Item: {{itemName}} (ID: {{itemId}})
    - Current Quantity: {{currentQuantity}}
    - Re-order Point: {{reorderPoint}}
    - Avg. Daily Sales: {{averageDailySales}}
    - Selling Price: $ {{sellingPrice}}
    - Supplier: {{supplierName}}
    - Lead Time: {{leadTimeDays}} days
  {{/each}}

  Based on this data, generate the structured stock alert.
  `,
});

const generateStockAlertFlow = ai.defineFlow(
  {
    name: 'generateStockAlertFlow',
    inputSchema: GenerateStockAlertInputSchema,
    outputSchema: GenerateStockAlertOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
