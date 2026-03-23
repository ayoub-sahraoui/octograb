/**
 * OctoGrab AI Agent — ReAct-style tool-calling loop.
 * Uses LangChain chat models with tool bindings for multi-provider support.
 * Browser-compatible (no Node.js dependencies).
 *
 * Detailed logging prefixed with [AI Agent] for debugging.
 */

import { SystemMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { SYSTEM_PROMPT } from './prompts';
import { ALL_TOOLS } from './tools';
import { createChatModel, type ProviderId } from './providers';

const log = (...args: any[]) => console.log('[AI Agent]', ...args);
const logError = (...args: any[]) => console.error('[AI Agent]', ...args);

// ─── Types ───────────────────────────────────────────────────────────────────

export type AgentStreamEvent = {
    type: 'tool_start';
    toolName: string;
    toolArgs: any;
} | {
    type: 'tool_end';
    toolName: string;
    result: string;
} | {
    type: 'agent_message';
    content: string;
} | {
    type: 'error';
    message: string;
} | {
    type: 'done';
};

// ─── Context Management ─────────────────────────────────────────────────────

/**
 * Estimate token count (rough: 1 token ≈ 4 chars for English).
 * Used to manage context window and prevent overflows.
 */
function estimateTokens(messages: BaseMessage[]): number {
    let chars = 0;
    for (const msg of messages) {
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        chars += content.length;
    }
    return Math.ceil(chars / 4);
}

/**
 * Truncate tool results in message history if context is getting too large.
 * Keeps the system prompt and last few messages intact, but compresses
 * older tool results.
 */
function manageContext(messages: BaseMessage[], maxTokens: number = 60000): BaseMessage[] {
    const estimated = estimateTokens(messages);
    if (estimated <= maxTokens) return messages;

    log(`Context management: ~${estimated} tokens exceeds ${maxTokens}, trimming old tool results`);

    // Strategy: truncate content of older ToolMessage entries
    const result = [...messages];
    for (let i = 1; i < result.length - 6; i++) {
        if (result[i] instanceof ToolMessage) {
            const raw = result[i].content;
            const content: string = typeof raw === 'string' ? raw : JSON.stringify(raw);
            if (content.length > 500) {
                result[i] = new ToolMessage({
                    tool_call_id: (result[i] as ToolMessage).tool_call_id,
                    content: content.substring(0, 300) + '\n…(truncated for context)',
                });
            }
        }
    }

    const newEstimate = estimateTokens(result);
    log(`Context after trimming: ~${newEstimate} tokens`);
    return result;
}

// ─── Agent Runner ────────────────────────────────────────────────────────────

export async function runAgentStream(
    provider: ProviderId,
    apiKey: string,
    messages: BaseMessage[],
    model: string,
    onEvent: (event: AgentStreamEvent) => void,
    abortSignal?: AbortSignal,
): Promise<BaseMessage[]> {
    log(`Starting agent run — provider=${provider}, model=${model}, historyLength=${messages.length}`);

    // Create the LLM with tool bindings
    let modelWithTools: any;
    try {
        const llm = await createChatModel(provider, apiKey, model);
        modelWithTools = (llm as any).bindTools(ALL_TOOLS);
        log(`Model created and tools bound (${ALL_TOOLS.length} tools)`);
    } catch (e: any) {
        logError('Failed to create model:', e.message);
        onEvent({ type: 'error', message: `Failed to initialize ${provider} model: ${e.message}` });
        onEvent({ type: 'done' });
        return messages;
    }

    // Build the full conversation with system prompt
    let currentMessages: BaseMessage[] = [
        new SystemMessage(SYSTEM_PROMPT),
        ...messages,
    ];

    const MAX_ITERATIONS = 10;
    const MAX_TOOL_CALLS = 15;
    let iteration = 0;
    let totalToolCalls = 0;
    const toolCallHistory: string[] = []; // track "toolName|argsHash" to detect duplicates

    while (iteration < MAX_ITERATIONS) {
        if (abortSignal?.aborted) {
            log('Aborted by user');
            onEvent({ type: 'error', message: 'Aborted by user' });
            break;
        }

        iteration++;
        log(`── Iteration ${iteration}/${MAX_ITERATIONS} ──`);

        // Manage context before each LLM call
        currentMessages = manageContext(currentMessages);
        log(`Sending ${currentMessages.length} messages (~${estimateTokens(currentMessages)} tokens)`);

        // ─── Call the LLM ────────────────────────────────────────────────
        let response: AIMessage;
        try {
            const startTime = Date.now();
            response = await modelWithTools.invoke(currentMessages) as AIMessage;
            const elapsed = Date.now() - startTime;
            log(`LLM responded in ${elapsed}ms`);
        } catch (e: any) {
            logError('LLM call failed:', e.message);
            if (e.message?.includes('429') || e.message?.includes('rate')) {
                onEvent({ type: 'error', message: 'Rate limited by the provider. Please wait a moment and try again.' });
            } else if (e.message?.includes('401') || e.message?.includes('auth')) {
                onEvent({ type: 'error', message: 'Authentication failed. Please check your API key in Settings.' });
            } else {
                onEvent({ type: 'error', message: e.message });
            }
            break;
        }

        // Log response details
        const responseContent = typeof response.content === 'string' ? response.content : '';
        const toolCalls = response.tool_calls ?? [];
        log(`Response: text=${responseContent.length} chars, toolCalls=${toolCalls.length}`);
        if (toolCalls.length > 0) {
            log('Tool calls:', toolCalls.map(tc => `${tc.name}(${JSON.stringify(tc.args).substring(0, 100)})`).join(', '));
        }

        // Add AI response to history
        currentMessages.push(response);

        // ─── Handle tool calls ───────────────────────────────────────────
        if (toolCalls.length > 0) {
            for (const toolCall of toolCalls) {
                if (abortSignal?.aborted) break;

                const toolName = toolCall.name;
                const toolArgs = toolCall.args;
                totalToolCalls++;

                // Duplicate detection
                const callSig = `${toolName}|${JSON.stringify(toolArgs)}`;
                const isDuplicate = toolCallHistory.includes(callSig);
                toolCallHistory.push(callSig);

                if (isDuplicate) {
                    log(`DUPLICATE tool call detected: ${toolName} — returning cached hint`);
                }

                // Budget check
                if (totalToolCalls > MAX_TOOL_CALLS) {
                    log(`Tool call budget exceeded (${totalToolCalls}/${MAX_TOOL_CALLS})`);
                    onEvent({ type: 'tool_start', toolName, toolArgs });
                    const budgetMsg = `Tool call budget exceeded. Please present your results now.`;
                    onEvent({ type: 'tool_end', toolName, result: budgetMsg });
                    currentMessages.push(new ToolMessage({
                        tool_call_id: toolCall.id!,
                        content: budgetMsg,
                    }));
                    continue;
                }

                log(`Executing tool: ${toolName}`, JSON.stringify(toolArgs).substring(0, 200));
                onEvent({ type: 'tool_start', toolName, toolArgs });

                const matchedTool = ALL_TOOLS.find(t => t.name === toolName);
                let result = '';

                if (isDuplicate) {
                    result = `You already called ${toolName} with the same arguments. Use the previous result instead of calling again.`;
                    log(`Returning duplicate hint for ${toolName}`);
                } else if (!matchedTool) {
                    result = `Unknown tool: ${toolName}. Available tools: ${ALL_TOOLS.map(t => t.name).join(', ')}`;
                    logError(`Unknown tool "${toolName}"`);
                } else {
                    try {
                        const toolStartTime = Date.now();
                        const observation = await (matchedTool as any).invoke(toolCall);
                        result = typeof observation === 'string'
                            ? observation
                            : (observation as any).content || JSON.stringify(observation);
                        const toolElapsed = Date.now() - toolStartTime;
                        log(`Tool ${toolName} completed in ${toolElapsed}ms — result: ${result.length} chars`);
                    } catch (e: any) {
                        result = `Tool error (${toolName}): ${e.message}`;
                        logError(`Tool ${toolName} threw:`, e.message);
                    }
                }

                onEvent({ type: 'tool_end', toolName, result });

                // Add tool result to history
                currentMessages.push(new ToolMessage({
                    tool_call_id: toolCall.id!,
                    content: result,
                }));
            }

            // Continue the loop — let the LLM respond to tool results
            continue;
        }

        // ─── Final text response (no tool calls) ────────────────────────
        if (responseContent) {
            log(`Final response: ${responseContent.substring(0, 200)}${responseContent.length > 200 ? '...' : ''}`);
            onEvent({ type: 'agent_message', content: responseContent });
        } else {
            log('Empty final response from LLM');
        }

        onEvent({ type: 'done' });
        break;
    }

    if (iteration >= MAX_ITERATIONS) {
        logError(`Hit max iterations (${MAX_ITERATIONS}) with ${totalToolCalls} tool calls`);
        onEvent({ type: 'error', message: 'Agent reached maximum iteration limit' });
        onEvent({ type: 'done' });
    }

    log(`Agent run complete — ${iteration} iterations, ${totalToolCalls} tool calls`);

    // Return messages excluding system prompt for state persistence
    return currentMessages.slice(1);
}
