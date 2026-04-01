import L, { LatLngBounds } from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect } from "react";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import type { Node } from "../../utils/geoUtils";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface TopologyMapPreviewProps {
  nodes: Node[];
}

function FitBounds({ nodes }: { nodes: Node[] }) {
  const map = useMap();

  useEffect(() => {
    if (nodes.length === 0) return;

    const bounds = new LatLngBounds(
      nodes.map((node) => [node.lat, node.lng] as [number, number])
    );

    map.fitBounds(bounds, { padding: [30, 30] });
  }, [nodes, map]);

  return null;
}

export default function TopologyMapPreview({
  nodes,
}: TopologyMapPreviewProps) {
  if (nodes.length === 0) {
    return (
      <div className="border rounded-3 p-4 text-muted small text-center">
        Map preview will appear after upload.
      </div>
    );
  }

  const firstNode = nodes[0];

  return (
    <div className="border rounded-3 overflow-hidden">
      <MapContainer
        center={[firstNode.lat, firstNode.lng]}
        zoom={12}
        style={{ height: "300px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds nodes={nodes} />

        {nodes.map((node) => (
          <Marker key={String(node.id)} position={[node.lat, node.lng]}>
            <Popup>
              <div>
                <div><strong>Node:</strong> {node.id}</div>
                <div><strong>Lat:</strong> {node.lat}</div>
                <div><strong>Lng:</strong> {node.lng}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}