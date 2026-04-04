export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';

export async function POST(request: Request) {
    try {
        const { url } = await request.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Fetch the HTML
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch recipe page');
        }

        const html = await response.text();
        const dom = new JSDOM(html);
        const doc = dom.window.document;

        // Try to find ALL schema.org markup scripts
        const schemaScripts = doc.querySelectorAll('script[type="application/ld+json"]');

        let recipe = null;

        for (const script of Array.from(schemaScripts)) {
            try {
                const jsonData = JSON.parse(script.textContent || '{}');

                // Handle both array and single object
                const items = Array.isArray(jsonData) ? jsonData : [jsonData];

                // Look through all items and nested graphs
                for (const item of items) {
                    // Check if @type is 'Recipe' or an array containing 'Recipe'
                    const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];

                    if (types.includes('Recipe')) {
                        recipe = item;
                        break;
                    }

                    // Check if there's a @graph property (common structure)
                    if (item['@graph']) {
                        const recipeInGraph = item['@graph'].find((g: any) => {
                            const graphTypes = Array.isArray(g['@type']) ? g['@type'] : [g['@type']];
                            return graphTypes.includes('Recipe');
                        });
                        if (recipeInGraph) {
                            recipe = recipeInGraph;
                            break;
                        }
                    }
                }

                if (recipe) break;
            } catch (e) {
                console.log('Failed to parse schema:', e);
                continue;
            }
        }

        if (recipe) {
            // Parse time strings like "PT15M" or "PT1H30M" to minutes
            const parseTime = (time?: string) => {
                if (!time) return null;
                let totalMinutes = 0;
                const hours = time.match(/(\d+)H/);
                const minutes = time.match(/(\d+)M/);
                if (hours) totalMinutes += parseInt(hours[1]) * 60;
                if (minutes) totalMinutes += parseInt(minutes[1]);
                return totalMinutes || null;
            };

            // Parse instructions - handle different formats
            let instructions = '';
            if (Array.isArray(recipe.recipeInstructions)) {
                instructions = recipe.recipeInstructions.map((step: any) => {
                    if (typeof step === 'string') return step;
                    if (step.text) return step.text;
                    if (step['@type'] === 'HowToStep' && step.text) return step.text;
                    return '';
                }).filter(Boolean).join('\n\n');
            } else if (typeof recipe.recipeInstructions === 'string') {
                instructions = recipe.recipeInstructions;
            }

            // Parse image - handle different formats
            let imageUrl = null;
            if (recipe.image) {
                if (typeof recipe.image === 'string') {
                    imageUrl = recipe.image;
                } else if (Array.isArray(recipe.image)) {
                    imageUrl = recipe.image[0]?.url || recipe.image[0];
                } else if (recipe.image.url) {
                    imageUrl = recipe.image.url;
                }
            }

            const recipeData = {
                name: recipe.name || '',
                ingredients: Array.isArray(recipe.recipeIngredient)
                    ? recipe.recipeIngredient
                    : [],
                instructions,
                prep_time: parseTime(recipe.prepTime),
                cook_time: parseTime(recipe.cookTime),
                image_url: imageUrl,
            };

            console.log('Successfully parsed recipe:', recipeData.name);
            return NextResponse.json(recipeData);
        }

        // If no schema found, return error
        throw new Error('No recipe schema found on page');

    } catch (error) {
        console.error('Recipe import error:', error);
        return NextResponse.json(
            { error: 'Failed to import recipe. The page may not have structured recipe data.' },
            { status: 500 }
        );
    }
}