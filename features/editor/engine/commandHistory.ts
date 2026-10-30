/**
 * Professional Icon Editor - Command History (Undo / Redo Manager)
 * Architecture Layer: Command History & Action Coalescing
 */

import type { EditorCore } from './editorCore'
import type { EditorCommand } from './commands'

export class CommandHistory {
  private undoStack: EditorCommand[] = []
  private redoStack: EditorCommand[] = []
  private maxHistorySize: number
  private listeners: Set<() => void> = new Set()

  constructor(maxHistorySize = 50) {
    this.maxHistorySize = maxHistorySize
  }

  public execute(command: EditorCommand, core: EditorCore): void {
    command.execute(core)
    this.undoStack.push(command)

    // Clear redo stack on every fresh mutation
    this.redoStack = []

    // Enforce memory boundary
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift()
    }

    this.notify()
  }

  public undo(core: EditorCore): boolean {
    if (!this.canUndo) return false

    const cmd = this.undoStack.pop()!
    cmd.undo(core)
    this.redoStack.push(cmd)
    this.notify()
    return true
  }

  public redo(core: EditorCore): boolean {
    if (!this.canRedo) return false

    const cmd = this.redoStack.pop()!
    cmd.execute(core)
    this.undoStack.push(cmd)
    this.notify()
    return true
  }

  public get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  public get canRedo(): boolean {
    return this.redoStack.length > 0
  }

  public get undoCount(): number {
    return this.undoStack.length
  }

  public get redoCount(): number {
    return this.redoStack.length
  }

  public getLastUndoDescription(): string | null {
    if (this.undoStack.length === 0) return null
    return this.undoStack[this.undoStack.length - 1].description
  }

  public getLastRedoDescription(): string | null {
    if (this.redoStack.length === 0) return null
    return this.redoStack[this.redoStack.length - 1].description
  }

  public clear(): void {
    this.undoStack = []
    this.redoStack = []
    this.notify()
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}
