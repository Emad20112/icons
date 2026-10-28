declare module 'imagetracerjs' {
  export interface ImageTracerOptions {
    corsenabled?: boolean
    ltres?: number
    qtres?: number
    pathomit?: number
    rightangleenhance?: boolean
    colorsampling?: number
    numberofcolors?: number
    mincolorratio?: number
    colorquantcycles?: number
    layering?: number
    strokewidth?: number
    linefilter?: boolean
    scale?: number
    roundcoords?: number
    viewbox?: boolean
    desc?: boolean
    lcpr?: number
    qcpr?: number
    blurradius?: number
    blurdelta?: number
    pal?: Array<{ r: number; g: number; b: number; a: number }>
  }

  export function imagedataToSVG(
    imgd: { width: number; height: number; data: Uint8ClampedArray | number[] },
    options?: ImageTracerOptions
  ): string

  export const optionpresets: Record<string, ImageTracerOptions>
  
  const ImageTracer: {
    imagedataToSVG: typeof imagedataToSVG
    optionpresets: typeof optionpresets
  }

  export default ImageTracer
}
