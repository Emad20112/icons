/**
 * Professional Icon Editor - Component Code Export Service
 * Generates production-ready Vue 3 (<script setup>) and React (JSX/TSX) component code.
 */

import type { EditorDocument } from '../types/editor'
import { SvgRenderer } from '../engine/svgRenderer'

export interface ComponentExportOptions {
  componentName?: string
  typescript?: boolean
  withProps?: boolean
  defaultSize?: number
  defaultColor?: string
  includeBackground?: boolean
}

export class EditorCodeExportService {
  /**
   * Sanitizes a string into a valid PascalCase identifier for Vue and React components.
   * Preserves existing internal capitalization while ensuring valid identifier syntax.
   */
  public static toPascalCase(name: string): string {
    if (!name || typeof name !== 'string') return 'CustomIcon'

    const cleaned = name
      .replace(/[^a-zA-Z0-9\s_-]/g, '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .trim()

    if (!cleaned) return 'CustomIcon'

    const words = cleaned
      .split(/\s+/)
      .filter(Boolean)

    let result = words
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('')

    if (!result.toLowerCase().endsWith('icon')) {
      result += 'Icon'
    } else {
      result = result.slice(0, -4) + 'Icon'
    }
    return result
  }

  /**
   * Extracts inner SVG markup (excluding outer <svg ...> tag).
   */
  public static extractInnerSvg(svgString: string): string {
    const match = svgString.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i)
    if (match && match[1]) {
      return match[1].trim()
    }
    return ''
  }

  /**
   * Generates a Vue 3 Single File Component (SFC) code snippet.
   */
  public static generateVue3Component(
    doc: EditorDocument,
    options: ComponentExportOptions = {}
  ): string {
    const name = this.toPascalCase(options.componentName || doc.name)
    const defaultSize = options.defaultSize || 24
    const defaultColor = options.defaultColor || 'currentColor'
    const viewBox = `${doc.viewBox.minX} ${doc.viewBox.minY} ${doc.viewBox.width} ${doc.viewBox.height}`
    
    // Render clean SVG to extract elements
    const rawSvg = SvgRenderer.renderToSvg(doc, {
      includeBackground: options.includeBackground ?? false,
      includeReferences: false
    })
    const innerSvg = this.extractInnerSvg(rawSvg)

    if (options.withProps === false) {
      return `<!-- ${name}.vue -->
<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="${viewBox}"
    width="${doc.width}"
    height="${doc.height}"
    fill="currentColor"
    role="img"
    aria-hidden="true"
  >
    ${innerSvg}
  </svg>
</template>
`
    }

    return `<!-- ${name}.vue -->
<script setup lang="ts">
interface Props {
  size?: number | string
  color?: string
  className?: string
  strokeWidth?: number | string
}

withDefaults(defineProps<Props>(), {
  size: ${defaultSize},
  color: '${defaultColor}',
  className: '',
  strokeWidth: 2
})
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :viewBox="'${viewBox}'"
    :width="size"
    :height="size"
    :fill="color"
    :class="className"
    role="img"
    aria-hidden="true"
  >
    ${innerSvg}
  </svg>
</template>
`
  }

  /**
   * Converts SVG attribute names from kebab-case to React camelCase JSX props.
   */
  public static svgToReactJsx(innerSvg: string): string {
    return innerSvg
      .replace(/stroke-width=/g, 'strokeWidth=')
      .replace(/stroke-linecap=/g, 'strokeLinecap=')
      .replace(/stroke-linejoin=/g, 'strokeLinejoin=')
      .replace(/stroke-miterlimit=/g, 'strokeMiterlimit=')
      .replace(/stroke-dasharray=/g, 'strokeDasharray=')
      .replace(/stroke-dashoffset=/g, 'strokeDashoffset=')
      .replace(/stroke-opacity=/g, 'strokeOpacity=')
      .replace(/fill-rule=/g, 'fillRule=')
      .replace(/clip-rule=/g, 'clipRule=')
      .replace(/fill-opacity=/g, 'fillOpacity=')
      .replace(/font-family=/g, 'fontFamily=')
      .replace(/font-size=/g, 'fontSize=')
      .replace(/font-weight=/g, 'fontWeight=')
      .replace(/text-anchor=/g, 'textAnchor=')
      .replace(/dominant-baseline=/g, 'dominantBaseline=')
      .replace(/class=/g, 'className=')
      .replace(/xmlns:xlink=/g, 'xmlnsXlink=')
      .replace(/xlink:href=/g, 'xlinkHref=')
  }

  /**
   * Generates a React (JSX / TSX) Functional Component code snippet.
   */
  public static generateReactComponent(
    doc: EditorDocument,
    options: ComponentExportOptions = {}
  ): string {
    const name = this.toPascalCase(options.componentName || doc.name)
    const defaultSize = options.defaultSize || 24
    const defaultColor = options.defaultColor || 'currentColor'
    const viewBox = `${doc.viewBox.minX} ${doc.viewBox.minY} ${doc.viewBox.width} ${doc.viewBox.height}`
    
    const rawSvg = SvgRenderer.renderToSvg(doc, {
      includeBackground: options.includeBackground ?? false,
      includeReferences: false
    })
    const innerSvg = this.extractInnerSvg(rawSvg)
    const jsxInner = this.svgToReactJsx(innerSvg)

    if (options.typescript ?? true) {
      return `// ${name}.tsx
import React from 'react'

export interface ${name}Props extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  color?: string
  className?: string
}

export const ${name}: React.FC<${name}Props> = ({
  size = ${defaultSize},
  color = '${defaultColor}',
  className = '',
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="${viewBox}"
      width={size}
      height={size}
      fill={color}
      className={className}
      role="img"
      aria-hidden="true"
      {...props}
    >
      ${jsxInner}
    </svg>
  )
}

export default ${name}
`
    }

    return `// ${name}.jsx
import React from 'react'

export const ${name} = ({
  size = ${defaultSize},
  color = '${defaultColor}',
  className = '',
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="${viewBox}"
      width={size}
      height={size}
      fill={color}
      className={className}
      role="img"
      aria-hidden="true"
      {...props}
    >
      ${jsxInner}
    </svg>
  )
}

export default ${name}
`
  }
}
