declare module '@mapbox/mapbox-gl-draw' {
    class MapboxDraw {
      constructor(options?: any)
      onAdd(map: any): HTMLElement
      onRemove(map: any): void
      getDefaultPosition?: () => any
      getAll(): any
      deleteAll(): this
      changeMode(mode: string, options?: any): this
      getMode(): string
    }
  
    export default MapboxDraw
  }