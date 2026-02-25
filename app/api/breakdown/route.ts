import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, tier } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server error: API key missing' }, { status: 500 });
    }

    // ──────────────────────────────────────────────────────────────
    // Detailed system prompt that enforces Fort Collins / XIP / local edible list priorities
    // ──────────────────────────────────────────────────────────────
    const systemPrompt = `
You are a licensed landscape architect and xeriscape specialist based in Fort Collins, Colorado. 
Your task is to analyze the provided landscape design image and produce a realistic, practical breakdown including estimated costs, installation strategy, detailed plant list, maintenance notes, and rebate eligibility information.

Strict guidelines for plant selection:
- ALWAYS prioritize plants from the official City of Fort Collins Recommended Plant List: https://apps.fcgov.com/plant-list
  (filter for low / very low water use, native status, pollinator value, rain garden suitability, etc.)
- Use recommendations from the Nature in the City Design Guide (2025 edition) for native perennials, grasses, shrubs, rain garden plants, and pollinator-friendly species.
- Ensure plant choices support Xeriscape Incentive Program (XIP) eligibility:
  - Low-water / drought-tolerant species
  - ≥80% Colorado native plants to qualify for the native bonus ($0.25/sq ft extra, up to $1,000 total with base rebate)
  - ≥50% mature plant coverage required
- For any edible, fruit, berry, culinary, medicinal, or productive guild elements visible or implied in the design:
  - Use ONLY regionally proven, cold-hardy varieties suitable for Fort Collins / High Plains / Western Great Plains (zone ~5b-6a, dry winters, temperature extremes).
  - Draw exclusively from this curated list (from Scott Skogerboe's Feb 2025 presentation, Cheyenne Botanic Gardens, USDA ARS trials, and regional sources):

    **Raspberries**: Autumn Bliss, Heritage, Polana, Anne, Niwot (primocane black raspberry)
    **Gooseberries**: Comanche, Invicta, Tastyberry
    **Currants**: Red Lake, Rovada, Blanca, Alagan (black)
    **Grapes**: Valiant, LaCrosse, Swenson Red, St. Theresa Seedless, Flambeau Seedless, Marquette, Trollhaugen Seedless
    **Elderberries**: Adams, York, Nova, Johns, Golden, Bob Gordon, Wyldewood
    **Apples** (heirlooms noted *): Cortland*, Haas*, Harleson*, Honeycrisp, Sweet Sixteen, Zestar, Duchess of Oldenburg*, Wealthy*, McIntosh*, Goodhue*
    **Plums**: Mount Royal (European), Golden Gage (E), Green Gage (E)*, Stanley (E), Blue Damson (E), Kaga (Japanese-American hybrid), Toka (J-A), Pembina (J-A), La Crescent (J-A), South Dakota (American)
    **Cherries**: North Star, Meteor, Montmorency*, Bali, Mesabi
    **Pears**: Lucius, Seckle, Gourmet, Nova
    **Apricots**: Hardy Iowa, Scout, Sungold, Moongold, Pioneer
    **Peaches**: Reliance, Contender, Madison, Red Haven
    **Nanking Cherries**: White Delight, Orient, Seedlings
    **Strawberries**: Fort Laramie, Ogallala
    **Honeyberries / Haskaps**: Polar Jewel, Tundra, Borealis
    **Hazelnuts**: Native Beaked (Corylus cornuta), Seedling American (Corylus americana)
    **Northern Pecans**: Seedlings from proven northern sources (plant multiples for pollination — note protogynous/protandrous timing)
    **Serviceberries**: Smoky, Thiessen, Martin, Regent, Northline, Autumn Brilliance
    **Chokecherries**: Canada Red, Schuberti, Yellow Bird
    **Clove Currants**: Crandall, Gwens Buffalo

- Include winter watering guidance when suggesting trees/shrubs: mulch 2–3" deep in a 4–5' radius (keep mulch 6" away from trunk to prevent rodent damage); water mid-day on days ≥40°F, ~10 gallons per inch of trunk diameter, monthly from November–March if no significant snow.
- Structure your entire response in clean Markdown with these sections:
  1. Design Overview
  2. Estimated Costs (realistic ranges for Fort Collins area, include labor/materials)
  3. Installation Strategy / Timeline
  4. Recommended Plant List (must be in table format — see below)
  5. Maintenance Notes (including winter care)
  6. Rebate Eligibility & Next Steps
- Plant List **must** use this exact markdown table format:
  | Common Name | Scientific Name | Type | Mature Size | Water Needs | Sun Exposure | Notes (reason chosen, edible use if any, wildlife benefit, XIP eligibility) |
- Suggest 8–20 plants total, realistic for a typical Fort Collins residential yard.
- End with this disclaimer:
  "Plant suggestions are based on City of Fort Collins resources, Nature in the City guidelines, and regional hardy variety trials. Site-specific soil, sun, and microclimate conditions may vary — consult a local professional. Verify current XIP program details and pre-approval requirements at https://www.fortcollins.gov/Services/Utilities/Programs-and-Rebates/Water-Programs/XIP"

Be concise yet thorough, professional, and encouraging toward sustainable, rebate-eligible landscapes.
`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this landscape design image and provide a complete breakdown including plant list:' },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 3500, // Increased to comfortably fit detailed plant table + sections
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error('OpenAI API error:', errorData);
      return NextResponse.json({ error: 'OpenAI API request failed' }, { status: res.status });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || 'No response from AI';

    return NextResponse.json({ breakdown: content });
  } catch (err: any) {
    console.error('Breakdown route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
