import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Menu, Save, Check, Loader2, Play, MoreHorizontal, MousePointer } from 'lucide-react';
import { Button } from '../components/Button';
import { NavRail } from '../components/NavRail';
import { ExecutionPanel } from '../components/ExecutionPanel';
import { Builder } from '../pages/Builder';
import { Plans } from '../pages/Plans';
import { Jobs } from '../pages/Jobs';
import { ExecutionHistory } from '../pages/ExecutionHistory';
import { AiWizard } from '../pages/AiWizard';
import { Settings } from '../pages/Settings';
import { useScraperBuilder } from '../../core/hooks';

function App() {
  console.log('App component rendering...');
  
  const {
    plan, setPlan,
    selectedBlockId, selectedBlock,
    savedPlans,
    jobs,
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

  console.log('App state:', { plan, savedPlans, jobs });

  // Add a simple test to ensure rendering works
  if (!plan) {
    console.error('Plan is undefined!');
    return <div style={{padding: '20px', color: 'red'}}>Error: Plan not initialized</div>;
  }

  return (
    <Router>
      <div className="h-full w-full bg-slate-50 flex font-sans text-slate-800 overflow-hidden">
        <NavRail />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <Header 
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            isPropertiesOpen={isPropertiesOpen}
            setIsPropertiesOpen={setIsPropertiesOpen}
            lastSaved={lastSaved}
            plan={plan}
            setPlan={setPlan}
            handleSavePlan={handleSavePlan}
            runSimulation={runSimulation}
            isSimulating={isSimulating}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden relative">
            <Routes>
              <Route path="/" element={<Navigate to="/builder" replace />} />
              <Route 
                path="/builder" 
                element={
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
                } 
              />
              <Route 
                path="/plans" 
                element={
                  <Plans 
                    plans={savedPlans} 
                    onLoad={handleLoadPlan} 
                    onDelete={handleDeletePlan} 
                    onRun={handleQueueJob} 
                  />
                } 
              />
              <Route 
                path="/jobs" 
                element={<Jobs jobs={jobs} />} 
              />
              <Route 
                path="/history" 
                element={<ExecutionHistory />} 
              />
              <Route 
                path="/ai-wizard" 
                element={<AiWizard onCreatePlan={handleAiPlanCreated} />} 
              />
              <Route 
                path="/settings" 
                element={<Settings />} 
              />
            </Routes>
          </div>
          
          {/* Overlays */}
          {showExecution && (
            <ExecutionPanel 
              logs={logs} 
              results={results} 
              onClose={() => setShowExecution(false)} 
              isRunning={isSimulating} 
            />
          )}
          {isPicking && (
            <div className="fixed top-16 md:top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-full shadow-lg z-100 flex items-center gap-2 animate-pulse"> 
              <MousePointer className="w-3.5 h-3.5 md:w-4 md:h-4" /> 
              <span className="text-xs md:text-sm font-bold">Picking Mode</span> 
              <span className="hidden sm:inline text-xs opacity-80">(ESC to cancel)</span> 
            </div>
          )}
        </div>
      </div>
    </Router>
  );
}

// Extracted Header Component
interface HeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isPropertiesOpen: boolean;
  setIsPropertiesOpen: (open: boolean) => void;
  lastSaved: Date | null;
  plan: any;
  setPlan: (plan: any) => void;
  handleSavePlan: () => void;
  runSimulation: () => void;
  isSimulating: boolean;
}

function Header({
  isSidebarOpen,
  setIsSidebarOpen,
  isPropertiesOpen,
  setIsPropertiesOpen,
  lastSaved,
  plan,
  setPlan,
  handleSavePlan,
  runSimulation,
  isSimulating
}: HeaderProps) {
  const location = window.location.hash;
  const isBuilderPage = location === '#/builder' || location === '#/';

  const getPageTitle = () => {
    if (location.includes('/builder')) return 'Plan Builder';
    if (location.includes('/plans')) return 'Plan Library';
    if (location.includes('/jobs')) return 'Job Queue';
    if (location.includes('/history')) return 'Execution History';
    if (location.includes('/settings')) return 'Settings';
    if (location.includes('/ai-wizard')) return 'AI Wizard';
    return 'OctoGrab';
  };

  return (
    <header className="bg-white border-b border-slate-200 px-3 md:px-4 py-2.5 md:py-3 flex items-center justify-between shadow-sm z-30 shrink-0">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          className="lg:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
        > 
          <Menu className="w-5 h-5" /> 
        </button>
        <h1 className="text-base md:text-lg font-bold text-slate-800 truncate">
          {getPageTitle()}
        </h1>
      </div>
      
      <div className="flex items-center gap-1.5 md:gap-2">
        {isBuilderPage && (
          <>
            <div className="relative group hidden sm:block">
              <Button variant="ghost" size="sm" className="px-2" title="Import JSON">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-upload"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              </Button>
              <input 
                type="file" 
                accept=".json"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const json = JSON.parse(event.target?.result as string);
                      if (json.pipeline && Array.isArray(json.pipeline)) {
                        setPlan(json);
                      } else {
                        alert('Invalid plan file format');
                      }
                    } catch (err) {
                      alert('Failed to parse JSON');
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
              />
            </div>
            
            <Button variant="ghost" size="sm" className="px-2 hidden sm:flex" title="Export JSON" onClick={() => {
              const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${plan.meta.name.replace(/\s+/g, '_').toLowerCase() || 'plan'}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            </Button>
            
            <div className="w-px h-5 md:h-6 bg-slate-200 mx-0.5 md:mx-1 hidden sm:block"></div>

            <Button variant="ghost" size="sm" icon={Save} onClick={handleSavePlan} className="hidden sm:flex">Save</Button>
            {lastSaved && (
              <span className="hidden md:flex items-center text-xs text-green-600 font-medium animate-in fade-in duration-300">
                <Check className="w-3 h-3 mr-1" /> Saved
              </span>
            )}
            <Button 
              variant="primary" 
              size="sm" 
              icon={isSimulating ? Loader2 : Play} 
              onClick={runSimulation} 
              disabled={isSimulating} 
              className={`${isSimulating ? "animate-pulse" : ""} text-xs md:text-sm`}
            >
              <span className="hidden sm:inline">{isSimulating ? "Running..." : "Dry Run"}</span>
              <span className="sm:hidden">{isSimulating ? "..." : "Run"}</span>
            </Button>
            <button 
              onClick={() => setIsPropertiesOpen(!isPropertiesOpen)} 
              className={`lg:hidden p-1.5 md:p-2 rounded ${isPropertiesOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'} transition-colors`}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </header>
  );
}

export default App;
