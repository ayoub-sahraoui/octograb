
import { useState, useRef, useEffect } from 'react';
import { Plan, Block, Job, SavedPlan, Log, ExecutionResult } from './types';
import { INITIAL_PLAN, BLOCK_TYPES } from './constants';
import { addBlockToTree, updateBlockInTree, deleteBlockFromTree, findBlock } from './utils';
import { sendToContentScript, onMessageFromContentScript } from './messaging';
import { PlanExecutor } from './executor';
import { RemoteExecutionEnvironment } from './remote-env';
import { db, ExecutionHistory } from './database';

export function useScraperBuilder() {
  // Plan State
  const [plan, setPlan] = useState<Plan>(JSON.parse(JSON.stringify(INITIAL_PLAN)));
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const selectedBlock = selectedBlockId ? findBlock(plan.pipeline, selectedBlockId) : null;

  // Storage State (now from Dexie)
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentExecutionId, setCurrentExecutionId] = useState<number | null>(null);

  // Execution & UI State
  const [showExecution, setShowExecution] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [results, setResults] = useState<ExecutionResult[]>([]);
  const [isPicking, setIsPicking] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);

  // Callback ref for element selection
  const pickingCallbackRef = useRef<((selector: string, xpath: string) => void) | null>(null);

  // Ref for the active executor
  const executorRef = useRef<PlanExecutor | null>(null);

  // Load data from Dexie on mount
  useEffect(() => {
    loadPlansFromDB();
    loadJobsFromDB();
  }, []);

  const loadPlansFromDB = async () => {
    const plans = await db.getAllPlans();
    setSavedPlans(plans);
  };

  const loadJobsFromDB = async () => {
    const jobsList = await db.getAllJobs();
    setJobs(jobsList);
  };

  // Listen for messages from content script
  useEffect(() => {
    const cleanup = onMessageFromContentScript((message) => {
      // Element Selection - Updates state but doesn't close
      if (message.type === 'ELEMENT_SELECTED' && pickingCallbackRef.current) {
        const { selector, xpath } = message.data;
        pickingCallbackRef.current(selector, xpath);
        // Don't close here anymore
      }

      // Picking Done/Cancel
      if (message.type === 'PICKING_DONE') {
        pickingCallbackRef.current = null;
        setIsPicking(false);
        setIsPropertiesOpen(true); // Open properties when done
      }

      // Legacy Execution logs listeners removed as we now run in sidepanel
    });

    return cleanup;
  }, []);

  // Block Handlers
  const handleAddBlock = (typeKey: string, parentId: string | null = null) => {
    // @ts-ignore
    const typeDef = BLOCK_TYPES[typeKey];
    if (!typeDef) {
      console.error("Unknown block type:", typeKey);
      return;
    }
    const newId = `${typeDef.type}_${Date.now()}`;
    const newBlock: Block = {
      id: newId,
      type: typeDef.type,
      ...(typeDef.type === 'navigate' && { url: 'https://' }),
      ...(typeDef.type === 'click' && { selector: '', selectorType: 'css' }),
      ...(typeDef.type === 'input' && { selector: '', selectorType: 'css', value: '' }),
      ...(typeDef.type === 'loop_elements' && { selector: '', selectorType: 'css', children: [] }),
      ...(typeDef.type === 'loop_pagination' && { config: { nextButtonSelector: '', nextButtonSelectorType: 'css' }, children: [] }),
      ...(typeDef.type === 'extract_scope' && { fields: [] }),
      ...(typeDef.type === 'scroll' && { scrollConfig: { target: 'window', behavior: 'bottom' } }),
      ...(typeDef.type === 'wait' && { waitConfig: { type: 'timeout', timeout: 2000 } }),
      ...(typeDef.type === 'condition' && { conditionConfig: { check: 'exists', selector: '', selectorType: 'css' }, children: [], elseChildren: [] })
    };

    // Special handling for adding to condition branches
    let targetParentId = parentId;
    let targetProperty: 'children' | 'elseChildren' = 'children';

    if (parentId && parentId.includes(':')) {
      const [realParentId, branch] = parentId.split(':');
      targetParentId = realParentId;
      if (branch === 'else') {
        targetProperty = 'elseChildren';
      }
    }

    const newPipeline = addBlockToTree(plan.pipeline, targetParentId, newBlock, targetProperty);
    setPlan({ ...plan, pipeline: newPipeline });
    setSelectedBlockId(newId);
    setIsPropertiesOpen(true);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const handleUpdateBlock = (id: string, updates: Partial<Block>) => {
    const newPipeline = updateBlockInTree(plan.pipeline, id, updates);
    setPlan({ ...plan, pipeline: newPipeline });
  };

  const handleDeleteBlock = (id: string) => {
    const newPipeline = deleteBlockFromTree(plan.pipeline, id);
    setPlan({ ...plan, pipeline: newPipeline });
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const handleBlockSelect = (e: React.MouseEvent, blockId: string) => {
    e.stopPropagation();
    setSelectedBlockId(blockId);
    setIsPropertiesOpen(true);
  };

  // Plan Management
  const handleSavePlan = async () => {
    const now = new Date().toISOString();
    const planName = plan.meta?.name || 'Untitled Plan';

    const savedPlan: SavedPlan = {
      id: currentPlanId || `plan_${Date.now()}`,
      name: planName,
      updatedAt: now,
      plan: JSON.parse(JSON.stringify(plan))
    };

    await db.savePlan(savedPlan);

    if (!currentPlanId) {
      setCurrentPlanId(savedPlan.id);
    }

    await loadPlansFromDB();
    setLastSaved(new Date());
    setTimeout(() => setLastSaved(null), 2000);
  };

  const handleLoadPlan = async (wrapperOrNull: SavedPlan | null) => {
    if (!wrapperOrNull) {
      setPlan(JSON.parse(JSON.stringify(INITIAL_PLAN)));
      setCurrentPlanId(null);
    } else {
      setPlan(JSON.parse(JSON.stringify(wrapperOrNull.plan)));
      setCurrentPlanId(wrapperOrNull.id);
    }
    window.location.hash = '#/builder';
  };

  const handleDeletePlan = async (planId: string) => {
    await db.deletePlan(planId);
    await loadPlansFromDB();
    if (currentPlanId === planId) {
      setPlan(JSON.parse(JSON.stringify(INITIAL_PLAN)));
      setCurrentPlanId(null);
    }
  };

  const handleQueueJob = async (targetPlan: SavedPlan) => {
    const newJob: Job = {
      id: `job_${Date.now()}`,
      planId: targetPlan.id, // Store reference to the plan
      planName: targetPlan.name || targetPlan.plan.meta?.name,
      status: 'queued',
      submittedAt: new Date().toLocaleString(),
      duration: null,
      items: null
    };
    await db.createJob(newJob);
    await loadJobsFromDB();
    window.location.hash = '#/jobs';
  };

  const handleAiPlanCreated = (newPlan: Plan) => {
    setPlan(newPlan);
    window.location.hash = '#/builder';
    setIsPropertiesOpen(false);
    setCurrentPlanId(null);
  };

  // Picking
  const startPicking = async (callback: (selector: string, xpath: string) => void, scoped = false, parentSelector: string | null = null) => {
    setIsPicking(true);
    setIsPropertiesOpen(false);
    setIsSidebarOpen(false);

    pickingCallbackRef.current = callback;

    // Send message to content script to start picking
    const response = await sendToContentScript({
      type: 'START_PICKING',
      scopeElement: scoped ? null : null, // TODO: Implement scope element passing
      parentSelector
    });

    if (!response.success) {
      console.error('[OctoGrab] Failed to start picking:', response.error);
      setIsPicking(false);
      alert(response.error || 'Failed to start element picker. Make sure you have a web page open.');
    }
  };

  // Logs
  const addLog = (message: string, type: Log['type'] = 'info') => {
    setLogs(prev => prev.concat([{ timestamp: new Date().toLocaleTimeString().split(' ')[0], message, type }]));
  };

  // Execution
  const runSimulation = async () => {
    if (isSimulating) return;

    // Reset state
    setShowExecution(true);
    setIsSimulating(true);
    setLogs([]);
    setResults([]);
    setIsPropertiesOpen(false);
    setIsSidebarOpen(false);

    addLog("Initializing execution environment...", "system");

    // Create execution history record
    const executionRecord: ExecutionHistory = {
      planId: currentPlanId || 'temp',
      planName: plan.meta?.name || 'Untitled Plan',
      startedAt: new Date().toISOString(),
      status: 'running',
      itemsScraped: 0,
      results: [],
      logs: []
    };

    const execId = await db.saveExecution(executionRecord);
    setCurrentExecutionId(execId);

    // Initialize Remote Environment
    const env = new RemoteExecutionEnvironment();

    // Sanity check connection
    try {
      await env.getUrl();
    } catch (e: any) {
      addLog(`Failed to connect to content script: ${e.message}. Please refresh the page and try again.`, "error");
      setIsSimulating(false);
      await db.updateExecution(execId, {
        status: 'failed',
        completedAt: new Date().toISOString()
      });
      return;
    }

    addLog("Starting Sidepanel Orchestration...", "system");

    // Initialize Executor
    const executor = new PlanExecutor(plan, env, {
      onLog: (msg, type) => addLog(msg, type),
      onResult: (data) => {
        setResults(prev => {
          const newResults = [...prev, data];
          // Update execution record with new result
          if (execId) {
            db.updateExecution(execId, {
              itemsScraped: newResults.length,
              results: newResults
            }).catch(console.error);
          }
          return newResults;
        });
      },
      onComplete: async () => {
        setIsSimulating(false);
        executorRef.current = null;
        addLog("Execution finished.", "success");

        // Update execution record as completed
        if (execId) {
          const endTime = new Date().toISOString();
          const startTime = new Date(executionRecord.startedAt);
          const duration = Math.round((new Date(endTime).getTime() - startTime.getTime()) / 1000);

          await db.updateExecution(execId, {
            status: 'completed',
            completedAt: endTime,
            duration,
            logs: logs.map(l => `${l.timestamp} [${l.type}] ${l.message}`)
          });
        }
      }
    });

    executorRef.current = executor;

    // Run execution
    executor.run().catch(async err => {
      addLog(`Top-level execution error: ${err.message}`, "error");
      setIsSimulating(false);
      executorRef.current = null;

      // Update execution as failed
      if (execId) {
        await db.updateExecution(execId, {
          status: 'failed',
          completedAt: new Date().toISOString(),
          logs: logs.map(l => `${l.timestamp} [${l.type}] ${l.message}`)
        });
      }
    });
  };

  // Optional: Stop function if we want to expose it
  const stopExecution = async () => {
    if (executorRef.current) {
      executorRef.current.stop();
      addLog("Stopping execution...", "system");

      // Update execution as stopped
      if (currentExecutionId) {
        await db.updateExecution(currentExecutionId, {
          status: 'stopped',
          completedAt: new Date().toISOString(),
          logs: logs.map(l => `${l.timestamp} [${l.type}] ${l.message}`)
        });
      }
    }
  };

  return {
    plan, setPlan,
    selectedBlockId, setSelectedBlockId, selectedBlock,
    savedPlans, setSavedPlans,
    jobs, setJobs,
    currentPlanId, setCurrentPlanId,
    lastSaved, setLastSaved,
    showExecution, setShowExecution,
    isSimulating, setIsSimulating,
    logs, results,
    isPicking, setIsPicking,
    isSidebarOpen, setIsSidebarOpen,
    isPropertiesOpen, setIsPropertiesOpen,
    handleAddBlock, handleUpdateBlock, handleDeleteBlock, handleBlockSelect,
    handleSavePlan, handleLoadPlan, handleDeletePlan, handleQueueJob, handleAiPlanCreated,
    startPicking, runSimulation, stopExecution
  };
}
