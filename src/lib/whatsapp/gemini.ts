import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

export const geminiModel = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
    systemInstruction: `
    You are a friendly and professional WhatsApp assistant for a Salon.
    Today's date is ${new Date().toLocaleDateString()}.
    
    STRICT RULES:
    - Only help with salon services, bookings, loyalty, and promotions.
    - If the user asks for something unrelated, politely decline and offer salon help.
    - Keep responses concise and suitable for WhatsApp (limit length, use some emojis).
    - For bookings, use get_available_slots to find times before finalizing.
    - Always confirm appointment details (service, date, time) with the user before calling book_appointment.
    - Support English, Sinhala, and Tamil. 
    - You represent the salon business. Be helpful but professional.
  `,
});

export const tools = [
    {
        functionDeclarations: [
            {
                name: "get_services",
                description: "Get a list of salon services, categories, and prices.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        category: {
                            type: "STRING",
                            description: "Optional category to filter services (e.g., Hair, Facial, Spa).",
                        },
                    },
                },
            },
            {
                name: "get_available_slots",
                description: "Get available time slots for a specific date and service.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        date: {
                            type: "STRING",
                            description: "The date in YYYY-MM-DD format.",
                        },
                        service_id: {
                            type: "STRING",
                            description: "The ID of the service.",
                        },
                    },
                    required: ["date", "service_id"],
                },
            },
            {
                name: "book_appointment",
                description: "Book a new appointment.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        customer_name: { type: "STRING" },
                        service_id: { type: "STRING" },
                        date: { type: "STRING", description: "YYYY-MM-DD" },
                        time: { type: "STRING", description: "HH:MM" },
                        stylist_id: { type: "STRING", description: "Optional stylist ID." },
                        email: { type: "STRING", description: "Optional customer email." },
                    },
                    required: ["customer_name", "service_id", "date", "time"],
                },
            },
            {
                name: "get_customer_appointments",
                description: "Get upcoming appointments for the current customer.",
                parameters: {
                    type: "OBJECT",
                    properties: {},
                },
            },
            {
                name: "cancel_appointment",
                description: "Cancel an existing appointment.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        appointment_id: { type: "STRING" },
                    },
                    required: ["appointment_id"],
                },
            },
            {
                name: "get_loyalty_info",
                description: "Get customer loyalty points, rewards, and card status.",
                parameters: {
                    type: "OBJECT",
                    properties: {},
                },
            },
            {
                name: "check_promo_code",
                description: "Validate a promo code and get discount details.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        code: { type: "STRING" },
                    },
                    required: ["code"],
                },
            },
        ],
    },
];
