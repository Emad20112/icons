/**
 * Professional Icon Editor - Command Pattern Implementation
 * Architecture Layer: Domain Commands (Reversible Actions)
 */

import type { EditorCore } from './editorCore'
import type { EditorElement } from '../types/editor'

export interface EditorCommand {
  readonly id: string
  readonly description: string
  execute(core: EditorCore): void
  undo(core: EditorCore): void
}

/**
 * Command to add a newly created element into the document.
 */
export class AddElementCommand implements EditorCommand {
  readonly id = `add_${Math.random().toString(36).substr(2, 9)}`
  readonly description: string

  constructor(
    private readonly element: EditorElement,
    private readonly targetIndex?: number
  ) {
    this.description = `Add ${element.name}`
  }

  execute(core: EditorCore): void {
    core.addElement(this.element, this.targetIndex)
    core.select(this.element.id)
  }

  undo(core: EditorCore): void {
    core.removeElement(this.element.id)
  }
}

/**
 * Command to remove an existing element from the document.
 */
export class RemoveElementCommand implements EditorCommand {
  readonly id = `remove_${Math.random().toString(36).substr(2, 9)}`
  readonly description: string
  private savedElement: EditorElement | null = null
  private savedIndex = -1

  constructor(private readonly elementId: string) {
    this.description = `Delete element`
  }

  execute(core: EditorCore): void {
    this.savedIndex = core.getElementIndex(this.elementId)
    this.savedElement = core.removeElement(this.elementId)
  }

  undo(core: EditorCore): void {
    if (this.savedElement && this.savedIndex >= 0) {
      core.addElement(this.savedElement, this.savedIndex)
      core.select(this.savedElement.id)
    }
  }
}

/**
 * Command to transform geometry (position, size, rotation) of an element.
 */
export class TransformElementCommand implements EditorCommand {
  readonly id = `transform_${Math.random().toString(36).substr(2, 9)}`
  readonly description: string

  constructor(
    private readonly elementId: string,
    private readonly beforeState: Record<string, unknown>,
    private readonly afterState: Record<string, unknown>,
    desc = 'Transform element'
  ) {
    this.description = desc
  }

  execute(core: EditorCore): void {
    core.updateElement(this.elementId, this.afterState as any)
  }

  undo(core: EditorCore): void {
    core.updateElement(this.elementId, this.beforeState as any)
  }
}

/**
 * Command to update styling or attributes (fill, stroke, opacity, text content, etc.).
 */
export class UpdateElementPropsCommand implements EditorCommand {
  readonly id = `prop_${Math.random().toString(36).substr(2, 9)}`
  readonly description: string

  constructor(
    private readonly elementId: string,
    private readonly beforePatch: Record<string, unknown>,
    private readonly afterPatch: Record<string, unknown>,
    description = 'Update property'
  ) {
    this.description = description
  }

  execute(core: EditorCore): void {
    core.updateElement(this.elementId, this.afterPatch as any)
  }

  undo(core: EditorCore): void {
    core.updateElement(this.elementId, this.beforePatch as any)
  }
}

/**
 * Command to reorder an element within the layer stack.
 */
export class ReorderElementCommand implements EditorCommand {
  readonly id = `reorder_${Math.random().toString(36).substr(2, 9)}`
  readonly description: string

  constructor(
    private readonly elementId: string,
    private readonly fromIndex: number,
    private readonly toIndex: number,
    desc = 'Reorder layer'
  ) {
    this.description = desc
  }

  execute(core: EditorCore): void {
    core.reorderElement(this.elementId, this.toIndex)
  }

  undo(core: EditorCore): void {
    core.reorderElement(this.elementId, this.fromIndex)
  }
}

/**
 * Batch command for grouping multiple atomic actions into one single undo/redo step.
 */
export class BatchCommand implements EditorCommand {
  readonly id = `batch_${Math.random().toString(36).substr(2, 9)}`
  readonly description: string

  constructor(
    private readonly commands: EditorCommand[],
    description = 'Batch operation'
  ) {
    this.description = description
  }

  execute(core: EditorCore): void {
    for (const cmd of this.commands) {
      cmd.execute(core)
    }
  }

  undo(core: EditorCore): void {
    // Reverse execution order during undo
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo(core)
    }
  }
}
