import React, { useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { reverseGeocode } from '../utils/geocode'
import { MAP_TILES, DEFAULT_TILE } from '../utils/mapTiles'
import L from 'leaflet'

// 复用 MapView 的图标修复
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
  })

function MapClickHandler({ onPoint }) {
  useMapEvents({
    click: (e) => onPoint(e.latlng)
  })
  return null
}

export default function MapPicker({ open, onClose, onSelect, initialLat, initialLng }) {
  const center = (initialLat != null && initialLng != null && !isNaN(parseFloat(initialLat)) && !isNaN(parseFloat(initialLng)))
    ? [parseFloat(initialLat), parseFloat(initialLng)]
    : [39.9, 116.4]

  const [pos, setPos] = useState(null)
  const [place, setPlace] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePoint = useCallback(async (latlng) => {
    const { lat, lng } = latlng
    setPos([lat, lng])
    setPlace('')
    setLoading(true)
    try {
      const name = await reverseGeocode(lat, lng)
      setPlace(name || '')
    } catch (_) {}
    setLoading(false)
  }, [])

  const handleConfirm = useCallback(() => {
    if (pos) {
      onSelect({ lat: pos[0], lng: pos[1], place: place || undefined })
      onClose()
    }
  }, [pos, place, onSelect, onClose])

  const handleClose = useCallback(() => {
    setPos(null)
    setPlace('')
    setLoading(false)
    onClose()
  }, [onClose])

  if (!open) return null

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={header}>
          <span>点击地图选点，再点「确定」</span>
          <button type="button" onClick={handleClose} style={closeBtn}>×</button>
        </div>
        <div style={mapWrap}>
          <MapContainer
            center={center}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution={MAP_TILES[DEFAULT_TILE].attribution}
              url={MAP_TILES[DEFAULT_TILE].url}
              maxZoom={MAP_TILES[DEFAULT_TILE].maxZoom}
            />
            {pos && <Marker position={pos} />}
            <MapClickHandler onPoint={handlePoint} />
          </MapContainer>
        </div>
        <div style={footer}>
          {pos && (
            <span style={coordText}>
              {pos[0].toFixed(5)}, {pos[1].toFixed(5)}
              {place && ` · ${place}`}
              {loading && ' …'}
            </span>
          )}
          <button type="button" onClick={handleConfirm} disabled={!pos} style={confirmBtn}>
            确定
          </button>
        </div>
      </div>
    </div>
  )
}

const overlay = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16
}

const modal = {
  background: '#fff',
  borderRadius: 12,
  overflow: 'hidden',
  width: '100%',
  maxWidth: 500,
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column'
}

const header = {
  padding: '14px 16px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid #eee',
  fontWeight: 600
}

const closeBtn = {
  background: 'none',
  border: 'none',
  fontSize: 24,
  cursor: 'pointer',
  color: '#666',
  padding: '0 8px',
  lineHeight: 1
}

const mapWrap = {
  height: 350
}

const footer = {
  padding: 12,
  borderTop: '1px solid #eee',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap'
}

const coordText = {
  fontSize: 12,
  color: '#666',
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis'
}

const confirmBtn = {
  padding: '8px 20px',
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontWeight: 600,
  cursor: 'pointer'
}
