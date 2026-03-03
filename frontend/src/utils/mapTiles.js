/**
 * 地图瓦片配置：OSM 在国内可能无法加载，Carto 使用全球 CDN 通常更稳定
 */
export const MAP_TILES = {
  // Carto Light：全球 CDN，国内可访问性较好
  carto: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19
  },
  // OSM 官方：国外稳定，国内可能被限速或阻断
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }
}

export const DEFAULT_TILE = 'carto'
