import React, { useState, useCallback, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, CircleMarker, Popup, useMapEvents } from 'react-leaflet'
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

export default function MapPicker({ open, onClose, onSelect, initialLat, initialLng, initialPlace }) {
  const hasInitial = initialLat != null && initialLng != null && !isNaN(parseFloat(initialLat)) && !isNaN(parseFloat(initialLng))
  const center = hasInitial ? [parseFloat(initialLat), parseFloat(initialLng)] : [39.9, 116.4]

  const [pos, setPos] = useState(null)
  const [place, setPlace] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentLoc, setCurrentLoc] = useState(null)

  // 打开时获取当前位置
  useEffect(() => {
    if (!open || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (p) => setCurrentLoc([p.coords.latitude, p.coords.longitude]),
      () => {},
      { enableHighAccuracy: false, timeout: 5000 }
    )
  }, [open])

  // 若有已选地点（文字搜索所得），显示为已选并预填
  useEffect(() => {
    if (open && hasInitial) {
      const [lat, lng] = [parseFloat(initialLat), parseFloat(initialLng)]
      setPos([lat, lng])
      setPlace(initialPlace || '')
      if (!initialPlace) {
        setLoading(true)
        reverseGeocode(lat, lng).then((name) => {
          setPlace(name || '')
          setLoading(false)
        }).catch(() => setLoading(false))
      }
    } else if (!open) {
      setPos(null)
      setPlace('')
    }
  }, [open, hasInitial, initialLat, initialLng, initialPlace])

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
    setCurrentLoc(null)
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
            {currentLoc && (
              <CircleMarker center={currentLoc} radius={8} pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.8, weight: 2 }}>
                <Popup>当前位置</Popup>
              </CircleMarker>
            )}
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
