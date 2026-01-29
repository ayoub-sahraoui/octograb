
import React from 'react';
import { Menu, Save, Check, Loader2, Play, MoreHorizontal, MousePointer } from 'lucide-react';
import { Button } from '../components/Button';
import { NavRail } from '../components/NavRail';
import { ExecutionPanel } from '../components/ExecutionPanel';
import { Builder } from '../pages/Builder';
import { Plans } from '../pages/Plans';
import { Jobs } from '../pages/Jobs';
import { AiWizard } from '../pages/AiWizard';
import { useScraperBuilder } from '../../core/hooks';



function App() {
  const {
    view, setView,
    plan, setPlan,
    selectedBlockId, selectedBlock,
    savedPlans,
    jobs,
    // currentPlanId, // unused
    lastSaved,
    showExecution, setShowExecution,
    isSimulating, 
    logs, results,
    isPicking,
    isSidebarOpen, setIsSidebarOpen,
    isPropertiesOpen, setIsPropertiesOpen,
    handleAddBlock, handleUpdateBlock, handleDeleteBlock, handleBlockSelect,
    handleSavePlan, handleLoadPlan, handleDeletePlan, handleQueueJob, handleAiPlanCreated,
    startPicking, runSimulation
  } = useScraperBuilder();

  return (
    <div className="h-screen bg-slate-50 flex font-sans text-slate-800 overflow-hidden">
      <NavRail view={view} setView={setView} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm z-30 shrink-0">
          <div className="flex items-center space-x-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-1 text-slate-600 hover:bg-slate-100 rounded"> <Menu className="w-6 h-6" /> </button>
            <h1 className="text-lg font-bold text-slate-800 truncate hidden sm:block">
               {view === 'builder' ? 'Plan Builder' : view === 'plans' ? 'Plan Library' : view === 'jobs' ? 'Job Queue' : 'AI Wizard'}
            </h1>
          </div>
          <div className="flex items-center space-x-2">
             {view === 'builder' && (
                 <>
                   <Button variant="ghost" size="sm" icon={Save} onClick={handleSavePlan}>Save</Button>
                   {lastSaved && (
                      <span className="hidden sm:flex items-center text-xs text-green-600 font-medium animate-in fade-in slide-in-from-right-4 duration-300">
                          <Check className="w-3 h-3 mr-1" /> Saved
                      </span>
                   )}
                   <Button variant="primary" size="sm" icon={isSimulating ? Loader2 : Play} onClick={runSimulation} disabled={isSimulating} className={isSimulating ? "animate-pulse" : ""}>{isSimulating ? "Running..." : "Dry Run"}</Button>
                   <button onClick={() => setIsPropertiesOpen(!isPropertiesOpen)} className={`lg:hidden p-2 rounded ml-1 ${isPropertiesOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}><MoreHorizontal className="w-6 h-6" /></button>
                 </>
             )}
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {view === 'builder' && (
            <Builder 
                plan={plan}
                setPlan={setPlan}
                selectedBlockId={selectedBlockId}
                selectedBlock={selectedBlock}
                handleBlockSelect={handleBlockSelect}
                handleAddBlock={handleAddBlock}
                handleDeleteBlock={handleDeleteBlock}
                handleUpdateBlock={handleUpdateBlock}
                startPicking={startPicking}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                isPropertiesOpen={isPropertiesOpen}
                setIsPropertiesOpen={setIsPropertiesOpen}
            />
          )}

          {view === 'plans' && (
            <Plans 
                plans={savedPlans} 
                onLoad={handleLoadPlan} 
                onDelete={handleDeletePlan} 
                onRun={handleQueueJob} 
            />
          )}

          {view === 'jobs' && <Jobs jobs={jobs} />}

          {view === 'ai-wizard' && <AiWizard onCreatePlan={handleAiPlanCreated} />}

        </div>
        
        {/* Overlays */}
        {showExecution && <ExecutionPanel logs={logs} results={results} onClose={() => setShowExecution(false)} isRunning={isSimulating} />}
        {isPicking && (
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg z-[1000000] flex items-center animate-bounce"> 
                <MousePointer className="w-4 h-4 mr-2" /> 
                <span className="text-sm font-bold">Picking Mode</span> 
                <span className="ml-2 text-xs opacity-80">(ESC to cancel)</span> 
            </div>
        )}
      </div>
    </div>
  );
}

export default App;
