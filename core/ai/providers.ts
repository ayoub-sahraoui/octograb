/**
 * Multi-provider LLM factory for OctoGrab AI Agent.
 * Supports OpenAI, Mistral, Gemini (Google), and Groq.
 * Each provider uses its own @langchain/* package.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

// ─── Provider Types ──────────────────────────────────────────────────────────

export type ProviderId = 'openai' | 'mistral' | 'gemini' | 'groq';

export interface ProviderConfig {
    id: ProviderId;
    label: string;
    description: string;
    apiKeyPlaceholder: string;
    apiKeyLink: string;
    models: { id: string; label: string; recommended?: boolean }[];
    defaultModel: string;
}

// ─── Provider Registry ───────────────────────────────────────────────────────

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
    openai: {
        id: 'openai',
        label: 'OpenAI',
        description: 'GPT-4o, GPT-4.1, etc.',
        apiKeyPlaceholder: 'sk-...',
        apiKeyLink: 'https://platform.openai.com/api-keys',
        models: [
            { id: 'gpt-4o', label: 'GPT-4o', recommended: true },
            { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
            { id: 'gpt-4.1', label: 'GPT-4.1' },
            { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
        ],
        defaultModel: 'gpt-4o',
    },
    mistral: {
        id: 'mistral',
        label: 'Mistral AI',
        description: 'Mistral Large, Medium, Small',
        apiKeyPlaceholder: 'your-mistral-key',
        apiKeyLink: 'https://console.mistral.ai/api-keys/',
        models: [
            { id: 'mistral-large-latest', label: 'Mistral Large', recommended: true },
            { id: 'mistral-medium-latest', label: 'Mistral Medium' },
            { id: 'mistral-small-latest', label: 'Mistral Small' },
            { id: 'codestral-latest', label: 'Codestral' },
        ],
        defaultModel: 'mistral-large-latest',
    },
    gemini: {
        id: 'gemini',
        label: 'Google Gemini',
        description: 'Gemini 2.5 Pro, Flash, etc.',
        apiKeyPlaceholder: 'your-google-ai-key',
        apiKeyLink: 'https://aistudio.google.com/apikey',
        models: [
            { id: 'gemini-2.5-pro-preview-05-06', label: 'Gemini 2.5 Pro', recommended: true },
            { id: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash' },
            { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
        ],
        defaultModel: 'gemini-2.5-flash-preview-05-20',
    },
    groq: {
        id: 'groq',
        label: 'Groq',
        description: 'LLaMA, Mixtral on Groq (fast)',
        apiKeyPlaceholder: 'gsk_...',
        apiKeyLink: 'https://console.groq.com/keys',
        models: [
            { id: 'llama-3.3-70b-versatile', label: 'LLaMA 3.3 70B', recommended: true },
            { id: 'llama-3.1-8b-instant', label: 'LLaMA 3.1 8B (fast)' },
            { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
        ],
        defaultModel: 'llama-3.3-70b-versatile',
    },
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

// ─── Model Factory ───────────────────────────────────────────────────────────

/**
 * Create a LangChain chat model for the given provider + API key + model.
 * Dynamically imports the provider package to avoid bundling unused providers.
 */
export async function createChatModel(
    provider: ProviderId,
    apiKey: string,
    model: string,
): Promise<BaseChatModel> {
    switch (provider) {
        case 'openai': {
            const { ChatOpenAI } = await import('@langchain/openai');
            return new ChatOpenAI({
                openAIApiKey: apiKey,
                model,
                temperature: 0.1,
            });
        }
        case 'mistral': {
            const { ChatMistralAI } = await import('@langchain/mistralai');
            return new ChatMistralAI({
                apiKey,
                model,
                temperature: 0.1,
            });
        }
        case 'gemini': {
            const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
            return new ChatGoogleGenerativeAI({
                apiKey,
                model,
                temperature: 0.1,
            });
        }
        case 'groq': {
            const { ChatGroq } = await import('@langchain/groq');
            return new ChatGroq({
                apiKey,
                model,
                temperature: 0.1,
            });
        }
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}
