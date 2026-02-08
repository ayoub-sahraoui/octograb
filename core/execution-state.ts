/**
 * Execution State Manager - Track progress and enable pause/resume
 */

export interface ExecutionCheckpoint {
    blockId: string;
    loopIndex?: number;
    timestamp: number;
    url: string;
}

export interface ExecutionState {
    isPaused: boolean;
    currentCheckpoint: ExecutionCheckpoint | null;
    totalBlocks: number;
    completedBlocks: number;
    totalIterations?: number;
    completedIterations?: number;
}

export class ExecutionStateManager {
    private state: ExecutionState = {
        isPaused: false,
        currentCheckpoint: null,
        totalBlocks: 0,
        completedBlocks: 0
    };

    private onStateChange?: (state: ExecutionState) => void;

    constructor(onStateChange?: (state: ExecutionState) => void) {
        this.onStateChange = onStateChange;
    }

    getState(): ExecutionState {
        return { ...this.state };
    }

    pause() {
        this.state.isPaused = true;
        this.notifyChange();
    }

    resume() {
        this.state.isPaused = false;
        this.notifyChange();
    }

    setCheckpoint(checkpoint: ExecutionCheckpoint) {
        this.state.currentCheckpoint = checkpoint;
        this.state.completedBlocks++;
        this.notifyChange();
    }

    setTotalBlocks(count: number) {
        this.state.totalBlocks = count;
        this.notifyChange();
    }

    setLoopProgress(total: number, completed: number) {
        this.state.totalIterations = total;
        this.state.completedIterations = completed;
        this.notifyChange();
    }

    reset() {
        this.state = {
            isPaused: false,
            currentCheckpoint: null,
            totalBlocks: 0,
            completedBlocks: 0
        };
        this.notifyChange();
    }

    isPaused(): boolean {
        return this.state.isPaused;
    }

    private notifyChange() {
        if (this.onStateChange) {
            this.onStateChange(this.getState());
        }
    }
}
