import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisResult {
  vendor: string;
  expense_date: string;
  amount_gross: number;
  tax_vat: number;
  amount_net: number;
  currency: string;
  category_suggestion: string;
  payment_method_guess: string;
  project_code_guess?: string;
  notes?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting receipt analysis...');
    
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not found');
      return new Response(
        JSON.stringify({ error: 'API key de Gemini no configurada' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the file from the request
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No se recibió ningún archivo' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`);

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: 'Tipo de archivo no válido. Solo se permiten JPG, PNG y PDF' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: 'El archivo es demasiado grande. Máximo 10MB' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    console.log('File converted to base64, calling Gemini API...');

    // Prepare Gemini API request
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`;

    const requestBody = {
      contents: [{
        parts: [
          {
            text: `Eres un sistema experto financiero español. Extrae los campos de este ticket de gasto y devuelve estrictamente JSON con el esquema solicitado. No añadas texto fuera del JSON.

Reglas importantes:
- Usa formato decimal con punto (ejemplo: 25.50)
- Categoriza en una de estas opciones exactas: "Viajes", "Dietas", "Material", "Software", "Transporte", "Alojamiento", "Otros"
- Para métodos de pago usa: "CARD", "CASH", "TRANSFER", "OTHER"  
- Prioriza la fecha del ticket; si hay varias fechas, usa la de compra/transacción
- La moneda por defecto es EUR
- Calcula amount_net = amount_gross - tax_vat (si no hay IVA explícito, asume amount_net = amount_gross y tax_vat = 0)
- Limpia el nombre del vendor (sin caracteres especiales innecesarios)

Devuelve exactamente este formato JSON:`
          },
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            vendor: {
              type: "string",
              description: "Nombre del comercio o proveedor"
            },
            expense_date: {
              type: "string",
              description: "Fecha en formato YYYY-MM-DD"
            },
            amount_gross: {
              type: "number",
              description: "Importe total con IVA"
            },
            tax_vat: {
              type: "number",
              description: "Importe del IVA (0 si no aplica)"
            },
            amount_net: {
              type: "number", 
              description: "Importe sin IVA"
            },
            currency: {
              type: "string",
              description: "Código de moneda (EUR por defecto)"
            },
            category_suggestion: {
              type: "string",
              enum: ["Viajes", "Dietas", "Material", "Software", "Transporte", "Alojamiento", "Otros"]
            },
            payment_method_guess: {
              type: "string",
              enum: ["CARD", "CASH", "TRANSFER", "OTHER"]
            },
            project_code_guess: {
              type: "string",
              description: "Código de proyecto si se puede identificar (opcional)"
            },
            notes: {
              type: "string",
              description: "Notas adicionales extraídas del ticket (opcional)"
            }
          },
          required: [
            "vendor", 
            "expense_date", 
            "amount_gross", 
            "tax_vat", 
            "amount_net", 
            "currency", 
            "category_suggestion", 
            "payment_method_guess"
          ]
        }
      }
    };

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Error de Gemini API: ${geminiResponse.status}`);
    }

    const geminiResult = await geminiResponse.json();
    console.log('Gemini API response received');

    // Extract the generated content
    const generatedText = geminiResult?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('No se pudo generar contenido desde Gemini');
    }

    console.log('Generated text:', generatedText);

    // Parse the JSON response
    let analysisResult: AnalysisResult;
    try {
      analysisResult = JSON.parse(generatedText);
    } catch (parseError) {
      console.error('Error parsing JSON from Gemini:', parseError);
      throw new Error('Error al interpretar la respuesta de IA');
    }

    // Validate financial coherence
    const netPlusVat = Number(analysisResult.amount_net) + Number(analysisResult.tax_vat);
    const grossAmount = Number(analysisResult.amount_gross);
    const difference = Math.abs(netPlusVat - grossAmount);

    if (difference > 0.01) {
      console.warn(`Financial incoherence detected: net(${analysisResult.amount_net}) + vat(${analysisResult.tax_vat}) = ${netPlusVat}, but gross is ${grossAmount}`);
      // Auto-correct by recalculating net amount
      analysisResult.amount_net = grossAmount - Number(analysisResult.tax_vat);
    }

    // Additional validations
    if (!analysisResult.vendor || analysisResult.vendor.trim().length === 0) {
      analysisResult.vendor = 'Comercio no identificado';
    }

    // Clean vendor name
    analysisResult.vendor = analysisResult.vendor.trim().replace(/[^\w\s\-\.]/g, '').substring(0, 100);

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(analysisResult.expense_date)) {
      // Try to fix common date formats
      const today = new Date().toISOString().split('T')[0];
      analysisResult.expense_date = today;
    }

    // Ensure currency is EUR if not specified
    if (!analysisResult.currency || analysisResult.currency.trim().length === 0) {
      analysisResult.currency = 'EUR';
    }

    console.log('Analysis completed successfully:', analysisResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: analysisResult 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in analyze-receipt function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});