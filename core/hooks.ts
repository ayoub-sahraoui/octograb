
import { useState, useRef, useEffect } from 'react';
import { Plan, Block, Job, SavedPlan, Log, ExecutionResult } from './types';
import { INITIAL_PLAN, BLOCK_TYPES, MOCK_SAVED_PLANS, MOCK_JOBS } from './constants';
import { addBlockToTree, updateBlockInTree, deleteBlockFromTree, findBlock } from './utils';
import { sendToContentScript, onMessageFromContentScript } from './messaging';

export function useScraperBuilder() {
  // Navigation
  const [view, setView] = useState('builder'); 

  // Plan State
  const [plan, setPlan] = useState<Plan>(JSON.parse(JSON.stringify(INITIAL_PLAN)));
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const selectedBlock = selectedBlockId ? findBlock(plan.pipeline, selectedBlockId) : null;
  
  // Storage State
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>(MOCK_SAVED_PLANS);
  const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

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
      
      // Execution Logging
      if (message.type === 'EXECUTION_LOG') {
        const { message: logMsg, type } = message.data;
        setLogs(prev => [...prev, { 
          timestamp: new Date().toLocaleTimeString().split(' ')[0], 
          message: logMsg, 
          type 
        }]);
      }
      
      // Execution Results
      if (message.type === 'EXECUTION_RESULT') {
        setResults(prev => [...prev, message.data]);
      }
      
      // Execution Complete
      if (message.type === 'EXECUTION_COMPLETE') {
        setIsSimulating(false);
        setLogs(prev => [...prev, { 
          timestamp: new Date().toLocaleTimeString().split(' ')[0], 
          message: 'Execution finished successfully', 
          type: 'success' 
        }]);
      }
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
        ...(typeDef.type === 'click' && { selector: '' }), 
        ...(typeDef.type === 'loop_elements' && { selector: '', children: [] }), 
        ...(typeDef.type === 'loop_pagination' && { config: { nextButtonSelector: '' }, children: [] }), 
        ...(typeDef.type === 'extract_scope' && { fields: [] }) 
    };
    const newPipeline = addBlockToTree(plan.pipeline, parentId, newBlock);
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
  const handleSavePlan = () => {
    const now = new Date().toISOString();
    const planName = plan.meta?.name || 'Untitled Plan';
    
    if (currentPlanId) {
        setSavedPlans(prev => prev.map(p => 
            p.id === currentPlanId 
            ? { ...p, name: planName, updatedAt: now, plan: JSON.parse(JSON.stringify(plan)) }
            : p
        ));
    } else {
        const newId = `plan_${Date.now()}`;
        const newSaved: SavedPlan = {
            id: newId,
            name: planName,
            updatedAt: now,
            plan: JSON.parse(JSON.stringify(plan))
        };
        setSavedPlans(prev => [newSaved, ...prev]);
        setCurrentPlanId(newId);
    }
    setLastSaved(new Date());
    setTimeout(() => setLastSaved(null), 2000);
  };

  const handleLoadPlan = (wrapperOrNull: SavedPlan | null) => {
    if (!wrapperOrNull) {
        setPlan(JSON.parse(JSON.stringify(INITIAL_PLAN)));
        setCurrentPlanId(null);
    } else {
        setPlan(JSON.parse(JSON.stringify(wrapperOrNull.plan)));
        setCurrentPlanId(wrapperOrNull.id);
    }
    setView('builder');
    setIsPropertiesOpen(false);
  };

  const handleDeletePlan = (id: string) => {
    // eslint-disable-next-line
    if (confirm("Are you sure?")) setSavedPlans(savedPlans.filter(p => p.id !== id));
  };

  const handleQueueJob = (targetPlan: SavedPlan) => {
    const newJob: Job = {
      id: `job_${Date.now()}`,
      planName: targetPlan.name || targetPlan.plan.meta?.name,
      status: 'queued',
      submittedAt: 'Just now',
      duration: null,
      items: null
    };
    setJobs([newJob, ...jobs]);
    setView('jobs');
  };

  const handleAiPlanCreated = (newPlan: Plan) => {
      setPlan(newPlan);
      setView('builder');
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
    setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString().split(' ')[0], message, type }]); 
  };

  // Execution
  const runSimulation = async () => {
    if (isSimulating) return;
    setShowExecution(true); 
    setIsSimulating(true); 
    setLogs([]); 
    setResults([]); 
    setIsPropertiesOpen(false); 
    setIsSidebarOpen(false);
    
    addLog("Initializing execution on active tab...", "system"); 
    
    const response = await sendToContentScript({
      type: 'EXECUTE_PLAN',
      plan: plan
    });

    if (!response.success) {
      addLog(`Failed to start execution: ${response.error}`, "error");
      setIsSimulating(false);
      // Also show alert if it's a connection error
      if (response.error?.includes('refresh')) {
        alert(response.error);
      }
    }
  };

  return {
    view, setView,
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
    startPicking, runSimulation
  };
}
