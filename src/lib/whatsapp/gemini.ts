import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

export const geminiModel = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash-exp",
    systemInstruction: `SalonFlow assistant. Be concise, use emojis. Support EN/SIN/TAM.
You are a read-only salon concierge. Your job is to answer questions about services, prices, availability, and loyalty information.
NEVER invent services, prices, or slots. ONLY use the provided SERVICES LIST context if present. If you don't know, ask them to call.

BOOKING RULES:
1. You CANNOT book appointments directly.
2. If a user asks to book, mentions a service they want, or asks to schedule an appointment, immediately call the "send_booking_link" tool.
3. If the user mentions personal facts (e.g. name, preferred stylist, favorite service, gender), immediately call "save_user_preference" to remember it.`,
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
                name: "send_booking_link",
                description: "Send the customer a link to book an appointment on the website.",
                parameters: {
                    type: "OBJECT",
                    properties: {}
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
            {
                name: "save_user_preference",
                description: "If the user mentions a personal fact (e.g., their name, preferred stylist, favorite service, gender), save it to their permanent profile.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        key: { type: "STRING", description: "e.g., 'preferred_stylist', 'name', 'hair_type'" },
                        value: { type: "STRING" }
                    },
                    required: ["key", "value"]
                }
            }
        ],
    },
];
